import { useEffect, useState, useRef, useMemo } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { supabase } from "@/integrations/supabase/client";
import { Bike } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  latitude: number;
  longitude: number;
  status: string;
  last_update: string;
  address?: string;
}

interface GoogleMapComponentProps {
  vehicles: Vehicle[];
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  onVehicleClick?: (vehicle: Vehicle) => void;
  forceCenterOnLoad?: boolean;
}

const containerStyle = {
  width: "100%",
  height: "100%",
  minHeight: "400px",
};

const defaultCenter = {
  lat: -23.5505,
  lng: -46.6333,
};

const CONFIG_KEY = "google_maps_api_key";

// ----------------------------------------------------------------------
// 1️⃣ Carregamento MANUAL do Google Maps (compatível com LOVABLE)
// ----------------------------------------------------------------------
const loadGoogleMaps = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    const existing = document.querySelector("#google-maps-sdk");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-sdk";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();
    script.onerror = () => reject("Erro ao carregar Google Maps");

    document.head.appendChild(script);
  });
};

// ----------------------------------------------------------------------

const GoogleMapComponent = ({
  vehicles,
  initialCenter,
  initialZoom = 13,
  onVehicleClick,
  forceCenterOnLoad = false,
}: GoogleMapComponentProps) => {
  const { toast } = useToast();

  const [apiKey, setApiKey] = useState<string>("");
  const [loadingMap, setLoadingMap] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const hasFittedBoundsRef = useRef(false);
  const centerAppliedRef = useRef(false);

  // ----------------------------------------------------------------------
  // 2️⃣ Carrega API KEY do Supabase
  // ----------------------------------------------------------------------
  useEffect(() => {
    const loadKey = async () => {
      const { data } = await supabase
        .from("tenant_config")
        .select("config_value")
        .eq("config_key", CONFIG_KEY)
        .maybeSingle();

      if (data?.config_value) {
        setApiKey(data.config_value);
      }
    };
    loadKey();
  }, []);

  // ----------------------------------------------------------------------
  // 3️⃣ Carrega o SDK do Google Maps quando a chave existe
  // ----------------------------------------------------------------------
  useEffect(() => {
    if (!apiKey) return;

    loadGoogleMaps(apiKey)
      .then(() => {
        setLoadingMap(false);
      })
      .catch((err) => {
        console.error(err);
        toast({
          title: "Erro",
          description: "Falha ao carregar Google Maps",
          variant: "destructive",
        });
      });
  }, [apiKey]);

  // ----------------------------------------------------------------------
  // 4️⃣ Normalização das coordenadas
  // ----------------------------------------------------------------------
  const parseCoord = (val: any) => {
    if (val == null) return null;
    const num = Number(String(val).replace(",", "."));
    return Number.isFinite(num) ? num : null;
  };

  const validVehicles = useMemo(() => {
    return vehicles
      .map((v) => ({
        ...v,
        latitude: parseCoord(v.latitude),
        longitude: parseCoord(v.longitude),
      }))
      .filter((v) => v.latitude != null && v.longitude != null);
  }, [vehicles]);

  // ----------------------------------------------------------------------
  // 5️⃣ Marker update
  // ----------------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current || !window.google || loadingMap) return;

    const allIds = new Set(vehicles.map((v) => v.id));

    markersRef.current.forEach((marker, id) => {
      if (!allIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    });

    validVehicles.forEach((vehicle) => {
      const pos = {
        lat: Number(vehicle.latitude),
        lng: Number(vehicle.longitude),
      };

      const existing = markersRef.current.get(vehicle.id);

      if (existing) {
        existing.setPosition(pos);
      } else {
        const marker = new google.maps.Marker({
          position: pos,
          map: mapRef.current,
          title: vehicle.plate,
        });

        marker.addListener("click", () => {
          if (onVehicleClick) onVehicleClick(vehicle);
        });

        markersRef.current.set(vehicle.id, marker);
      }
    });

    if (!hasFittedBoundsRef.current && validVehicles.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      validVehicles.forEach((v) => bounds.extend({ lat: v.latitude!, lng: v.longitude! }));

      mapRef.current?.fitBounds(bounds);
      hasFittedBoundsRef.current = true;
    }
  }, [validVehicles, loadingMap]);

  // ----------------------------------------------------------------------

  if (!apiKey || loadingMap) {
    return (
      <div className="h-96 flex items-center justify-center bg-muted/20 rounded-lg">
        <p>Carregando mapa...</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      onLoad={(map) => {
        mapRef.current = map;
        setMapReady(true);
      }}
      center={initialCenter || defaultCenter}
      zoom={initialZoom}
      options={{
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      }}
    ></GoogleMap>
  );
};

export default GoogleMapComponent;
