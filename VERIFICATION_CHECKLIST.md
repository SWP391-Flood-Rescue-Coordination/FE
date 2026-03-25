# Verification Checklist - numberOfAffectedPeople Mapping

## What FE is Sending ✅

### RequestForm → rescueRequestService
```
User inputs: totalPeople = 5
Form submits with:
{
  contactName: "Nguyễn A",
  phone: "0901234567",
  location: "10.7769, 106.7009",
  address: "123 Đường ABC",
  totalPeople: "5",
  elderly: "1",
  children: "2",
  conditions: {...},
  notes: "..."
}
```

### Service Transforms to API Payload
```javascript
rescueRequestService.buildCreatePayload(formData)
↓
{
  contactName: "Nguyễn A",
  contactPhone: "0901234567",
  latitude: 10.7769,
  longitude: 106.7009,
  address: "123 Đường ABC",
  numberOfPeople: 5,        ← totalPeople mapped here
  adultCount: 2,
  elderlyCount: 1,
  childrenCount: 2,
  description: "...",
  title: "..."
}
```

### API POST Request
```
POST /api/RescueRequest/Create
Content-Type: application/json

{
  "numberOfPeople": 5,
  "adultCount": 2,
  "elderlyCount": 1,
  "childrenCount": 2,
  ...
}
```

### API UPDATE Request (Coordinator editing)
```
PUT /api/RescueRequest/UpdateAsCoordinator/{id}
Content-Type: application/json

{
  "numberOfPeople": 5,              ← Sent
  "numberOfAffectedPeople": 5,      ← ALSO Sent (key for mapping)
  "adultCount": 2,
  "elderlyCount": 1,
  "childrenCount": 2,
  ...
}
```

## What BE Should Do

### Step 1: Verify DTO Has Property
```csharp
public class RescueRequestDto
{
    public int? NumberOfPeople { get; set; }
    public int? NumberOfAffectedPeople { get; set; }  // ← Should exist
}
```

### Step 2: Ensure JSON Mapping
Option A - Add JsonProperty:
```csharp
[JsonProperty("numberOfAffectedPeople")]
public int? NumberOfAffectedPeople { get; set; }
```

### Step 3: Map to Database Entity
```csharp
var entity = new RescueRequest
{
    // Prefer numberOfAffectedPeople, fallback to numberOfPeople
    NumberOfAffectedPeople = dto.NumberOfAffectedPeople ?? dto.NumberOfPeople,
    NumberOfPeople = dto.NumberOfPeople,
    AdultCount = dto.AdultCount,
    // ... rest of mapping
};
```

## Testing Verification

### Test 1: Create New Request
1. Open RequestForm (citizen)
2. Enter totalPeople = 10, elderly = 1, children = 2
3. Submit form
4. **DB Check**: SELECT number_of_affected_people FROM rescue_requests WHERE id = <latest>
   - Expected: 10 ✅

### Test 2: Update Request (Coordinator)
1. Go to Coordinator Dashboard
2. Click Edit on existing request
3. Change totalPeople = 15
4. Click Save
5. **DB Check**: SELECT number_of_affected_people FROM rescue_requests WHERE id = <same>
   - Expected: 15 ✅

### Test 3: Guest Update (AccessCode)
1. Submit request as citizen → get access code
2. Use access code to edit request
3. Change totalPeople = 8
4. Submit
5. **DB Check**: SELECT number_of_affected_people FROM rescue_requests WHERE id = <same>
   - Expected: 8 ✅

## Expected Result
After BE mapping fix:
- ✅ Create request: number_of_affected_people = totalPeople
- ✅ Update request: number_of_affected_people = updated totalPeople
- ✅ All endpoints (Create, UpdateAsCoordinator, UpdateAsGuest) save value
- ✅ FE reads back value correctly in dashboards
