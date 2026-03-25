# BE Mapping Required: numberOfPeople → number_of_affected_people

## Current Status

### FE Side ✅ COMPLETE
- **RequestForm.jsx**: Form chính gửi API rescue request với `totalPeople` từ input
- **ReportForm.jsx**: Local dashboard report (không gửi API, chỉ local popup)
- **rescueRequestService.js**: 
  - `buildCreatePayload()` gửi `numberOfPeople: totalPeople` (line 413)
  - `buildUpdateAsCoordinator()` gửi cả `numberOfPeople` + `numberOfAffectedPeople: totalPeople` (line 544)
  - `buildGuestUpdatePayload()` gửi `numberOfPeople: totalPeople` (line 567)

### API Request Payloads (From RequestForm)
```javascript
// CREATE Request (RescueRequest/Create):
{
  numberOfPeople: <totalPeople>,
  title, contactName, contactPhone, description,
  latitude, longitude, address,
  adultCount, elderlyCount, childrenCount,
  ...other fields
}

// UPDATE Request (RescueRequest/Update - Coordinator role):
{
  numberOfPeople: <totalPeople>,
  numberOfAffectedPeople: <totalPeople>,  // ← Key: Both fields sent
  title, contactName, contactPhone, description,
  latitude, longitude, address,
  adultCount, elderlyCount, childrenCount,
  status, updatedAt,
  canReportSafe, ...other fields
}

// UPDATE Request (Guest - AccessCode only):
{
  numberOfPeople: <totalPeople>,
  title, contactPhone, description,
  latitude, longitude, address,
  adultCount, elderlyCount, childrenCount,
  ...other fields
}
```

## BE Action Required

### DTO Property Status
- ✅ `number_of_affected_people` column exists in rescue_requests table
- ⚠️ DTO may have property but JSON deserialization not binding `numberOfAffectedPeople`

### Root Cause
When receiving JSON with `numberOfAffectedPeople: <value>`, BE DTO property name mismatch:
- JSON sends: `numberOfPeople` + `numberOfAffectedPeople` (camelCase)
- DTO expects: mapped to `NumberOfAffectedPeople` property (PascalCase)
- Missing: JsonProperty attribute or property name binding

### Fix Options (Choose one):

**Option A (Recommended): Add JsonProperty to DTO**
```csharp
public class RescueRequestDto
{
    [JsonProperty("numberOfAffectedPeople")]  // ← Add this
    public int? NumberOfAffectedPeople { get; set; }
    
    public int? NumberOfPeople { get; set; }
}
```

**Option B: Map in Create/Update Action**
```csharp
[HttpPost]
public async Task<IActionResult> Create([FromBody] RescueRequestDto dto)
{
    var entity = new RescueRequest
    {
        // Map both - use numberOfAffectedPeople if present, fallback to numberOfPeople
        NumberOfAffectedPeople = dto.NumberOfAffectedPeople ?? dto.NumberOfPeople,
        // ... other fields
    };
    return Ok(await service.CreateAsync(entity));
}
```

**Option C: Global JsonSerializerOptions**
```csharp
// Program.cs
services.AddControllers()
    .AddJsonOptions(options => {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        // Add custom converter if needed
    });
```

## Verification
- FE currently sending: ✅ `numberOfPeople`, ✅ `numberOfAffectedPeople` 
- BE should bind to: `number_of_affected_people` column
- Test: Create/Update request → verify DB saves value in `number_of_affected_people`
