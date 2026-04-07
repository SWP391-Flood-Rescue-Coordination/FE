import { useEffect, useRef, useState } from 'react'
import { HomeIcon, MapPinIcon } from '@heroicons/react/24/outline'

const DEFAULT_CENTER = [10.7769, 106.7009]
const HCM_BOUNDS = {
  southWest: [10.2, 106.2],
  northEast: [11.2, 107.1],
}

const isWithinHcmBounds = (lat, lng) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false
  }

  const latMatch = lat >= HCM_BOUNDS.southWest[0] && lat <= HCM_BOUNDS.northEast[0]
  const lngMatch = lng >= HCM_BOUNDS.southWest[1] && lng <= HCM_BOUNDS.northEast[1]
  return latMatch && lngMatch
}

function MapLocationPicker({
  latitude,
  longitude,
  address,
  onLocationChange,
  onError,
  disabled = false,
  showCoordinates = true,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [mapError, setMapError] = useState('')

  const latValue = Number(latitude)
  const lngValue = Number(longitude)
  const hasCoordinates = Number.isFinite(latValue) && Number.isFinite(lngValue)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !window?.L) {
      return undefined
    }

    const L = window.L
    const bounds = L.latLngBounds(HCM_BOUNDS.southWest, HCM_BOUNDS.northEast)

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'OpenStreetMap',
    }).addTo(map)

    mapRef.current = map

    const handleMapClick = async (event) => {
      if (disabled) {
        return
      }

      const { lat, lng } = event.latlng

      if (!isWithinHcmBounds(lat, lng)) {
        const errorMessage = 'Chỉ hỗ trợ trong khu vực TP.HCM.'
        setMapError(errorMessage)
        onError?.(errorMessage)
        return
      }

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        )
        const data = await response.json()
        const addressObj = data?.address || {}
        const addressFields = [
          addressObj.city,
          addressObj.state,
          addressObj.county,
          addressObj.town,
          addressObj.village,
          addressObj.suburb,
          data?.display_name,
        ]

        const normalizedAddress = addressFields
          .filter((value) => Boolean(value))
          .join(', ')

        const locationLabel = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        const resolvedAddress = normalizedAddress || data?.display_name || locationLabel

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
        } else {
          markerRef.current = L.marker([lat, lng]).addTo(map)
        }

        setMapError('')
        onError?.('')
        onLocationChange?.({ latitude: lat, longitude: lng, address: resolvedAddress })
      } catch (error) {

        const fallbackMessage = 'Không thể xác định địa chỉ từ vị trí này.'
        setMapError(fallbackMessage)
        onError?.(fallbackMessage)
      }
    }

    map.on('click', handleMapClick)

    return () => {
      map.off('click', handleMapClick)
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [disabled, onError, onLocationChange])

  useEffect(() => {
    if (!mapRef.current || !hasCoordinates) {
      return
    }

    const target = [latValue, lngValue]
    mapRef.current.setView(target, mapRef.current.getZoom())

    if (markerRef.current) {
      markerRef.current.setLatLng(target)
    } else {
      markerRef.current = window.L.marker(target).addTo(mapRef.current)
    }
  }, [hasCoordinates, latValue, lngValue])

  return (
    <div className="map-location-picker">
      <div className="map-location-info">
        {showCoordinates && (
          <div className="map-location-row">
            <MapPinIcon className="map-location-icon" />
            <span>{hasCoordinates ? `${latValue.toFixed(6)}, ${lngValue.toFixed(6)}` : 'Chưa chọn vị trí'}</span>
          </div>
        )}
        <div className="map-location-row">
          <HomeIcon className="map-location-icon" />
          <span>{address || 'Chưa có địa chỉ'}</span>
        </div>
      </div>

      <div
        ref={mapContainerRef}
        className={`map-location-container ${disabled ? 'is-disabled' : ''}`}
        aria-label="Bản đồ chọn vị trí"
      />

      <div className="map-location-note">Chỉ hỗ trợ chọn trong khu vực TP.HCM.</div>
      {(mapError || '') && <p className="map-location-error">{mapError}</p>}
    </div>
  )
}

export default MapLocationPicker

