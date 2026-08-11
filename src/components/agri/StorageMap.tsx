import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Key } from 'lucide-react';

interface StorageFacility {
  id: number;
  name: string;
  location: string;
  status: 'Available' | 'Limited' | 'Full';
  lat: number;
  lng: number;
  pricePerQuintal: number;
  available: string;
}

interface StorageMapProps {
  facilities: StorageFacility[];
  onSelectFacility?: (facility: StorageFacility) => void;
}

const STORAGE_KEY = 'mapbox_public_token';

const StorageMap: React.FC<StorageMapProps> = ({ facilities, onSelectFacility }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  // Fix: Load token securely from environment variables instead of localStorage
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    try {
      mapboxgl.accessToken = mapboxToken;
      
      // Center on Nashik region
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [73.85, 20.0],
        zoom: 9,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        setIsMapReady(true);
      });

      map.current.on('error', () => {
        setIsMapReady(false);
      });

    } catch (error) {
      console.error('Map initialization error:', error);
      setIsMapReady(false);
    }

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Add markers when map is ready
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    facilities.forEach((facility) => {
      const markerColor = 
        facility.status === 'Available' ? '#22c55e' :
        facility.status === 'Limited' ? '#eab308' : '#ef4444';

      const el = document.createElement('div');
      el.className = 'storage-marker';
      el.style.backgroundColor = markerColor;
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.cursor = 'pointer';
      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '16');
      svg.setAttribute('height', '16');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'white');
      
      const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path1.setAttribute('d', 'M3 21V8l9-4 9 4v13H3zm2-2h14V9l-7-3.1L5 9v10z');
      
      const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path2.setAttribute('d', 'M10 14h4v5h-4z');
      
      svg.appendChild(path1);
      svg.appendChild(path2);
      el.appendChild(svg);

      // Fix: Strictly use DOM methods instead of innerHTML to completely eliminate DOM XSS risks
      const popupContent = document.createElement('div');
      popupContent.style.padding = '8px';
      popupContent.style.minWidth = '150px';

      const title = document.createElement('h4');
      title.style.fontWeight = 'bold';
      title.style.marginBottom = '4px';
      title.textContent = facility.name;
      popupContent.appendChild(title);

      const location = document.createElement('p');
      location.style.fontSize = '12px';
      location.style.color = '#666';
      location.style.marginBottom = '4px';
      location.textContent = facility.location;
      popupContent.appendChild(location);

      const statusP = document.createElement('p');
      statusP.style.fontSize = '12px';
      statusP.style.marginBottom = '4px';
      const statusSpan = document.createElement('span');
      statusSpan.style.color = markerColor;
      statusSpan.style.fontWeight = 'bold';
      statusSpan.textContent = facility.status;
      statusP.appendChild(statusSpan);
      statusP.appendChild(document.createTextNode(' • '));
      statusP.appendChild(document.createTextNode(facility.available));
      popupContent.appendChild(statusP);

      const priceP = document.createElement('p');
      priceP.style.fontSize = '14px';
      priceP.style.fontWeight = 'bold';
      priceP.style.color = '#2d7a3d';
      priceP.textContent = `₹${Number.isFinite(facility.pricePerQuintal) ? facility.pricePerQuintal : 0}/quintal`;
      popupContent.appendChild(priceP);

      const popup = new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupContent);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([facility.lng, facility.lat])
        .setPopup(popup)
        .addTo(map.current!);

      el.addEventListener('click', () => {
        onSelectFacility?.(facility);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (facilities.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      facilities.forEach(f => bounds.extend([f.lng, f.lat]));
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 12 });
    }
  }, [facilities, isMapReady, onSelectFacility]);

  if (!mapboxToken) {
    return (
      <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          <Key size={32} className="text-primary mb-2" />
          <p className="text-sm text-foreground font-medium mb-2 text-center">
          Mapbox Token Required
          </p>
          <p className="text-xs text-muted-foreground mt-2 text-center">
          Please add VITE_MAPBOX_TOKEN to your environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-48 rounded-lg overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0" />
      {!isMapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
};

export default StorageMap;
