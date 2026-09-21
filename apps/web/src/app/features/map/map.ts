import {
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import type { RouteDto, VehiclePositionMessage } from '@routeflow/contracts';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import * as maplibregl from 'maplibre-gl';
import { MAP_TILES_URL } from '../../core/api-config';
import { RealtimeService } from '../../core/realtime.service';
import { RoutesService } from '../routes/routes.service';

/** Nomes das camadas/fonte usadas no mapa. */
const VEHICLES_SOURCE = 'vehicles';
const VEHICLES_LAYER = 'vehicles-layer';
const ROUTES_SOURCE = 'routes';
const ROUTES_LAYER = 'routes-layer';

/**
 * Centro inicial do mapa (São Paulo), coincidente com o seed de demonstração.
 */
const INITIAL_CENTER: [number, number] = [-46.6333, -23.5505];

/**
 * Mapa em tempo real.
 *
 * Renderiza o mapa base (MapLibre) com as rotas cadastradas e os veículos
 * recebidos via WebSocket, atualizando suas posições e colorindo pelo `status`.
 */
@Component({
  selector: 'app-map',
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class MapView implements OnInit {
  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
  private readonly realtime = inject(RealtimeService);
  private readonly routesService = inject(RoutesService);
  private readonly tilesUrl = inject(MAP_TILES_URL);
  private readonly destroyRef = inject(DestroyRef);

  /** Instância do mapa (maplibre-gl). */
  private map?: MapLibreMap;

  /** Indica que o estilo base terminou de carregar. */
  private mapReady = false;

  /** Erro ao carregar as rotas. */
  protected readonly error = signal<string | null>(null);

  /** Total de veículos conhecidos. */
  protected readonly vehicleCount = signal(0);

  /** Status da conexão em tempo real. */
  protected readonly connection = this.realtime.status;

  constructor() {
    // Redesenha os veículos sempre que o estado em tempo real muda.
    effect(() => {
      const vehicles = this.realtime.vehicles();
      this.vehicleCount.set(vehicles.size);

      if (this.mapReady) {
        this.drawVehicles([...vehicles.values()]);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    this.createMap();
    this.realtime.connect();
    await this.loadRoutes();
  }

  /** Cria o mapa base e registra as fontes/camadas. */
  private createMap(): void {
    const map = new maplibregl.Map({
      container: this.container().nativeElement,
      style: {
        version: 8,
        sources: {
          'base-tiles': {
            type: 'raster',
            tiles: [this.tilesUrl],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'base-tiles', type: 'raster', source: 'base-tiles' }],
      },
      center: INITIAL_CENTER,
      zoom: 11,
    });

    this.map = map;

    map.on('load', () => {
      this.mapReady = true;
      this.addRoutesLayer();
      this.addVehiclesLayer();
      this.drawVehicles([...this.realtime.vehicles().values()]);
    });

    this.destroyRef.onDestroy(() => {
      this.map?.remove();
      this.map = undefined;
    });
  }

  /** Adiciona a fonte e a camada das rotas. */
  private addRoutesLayer(): void {
    const map = this.map;

    if (!map || map.getSource(ROUTES_SOURCE)) {
      return;
    }

    map.addSource(ROUTES_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
      id: ROUTES_LAYER,
      type: 'line',
      source: ROUTES_SOURCE,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#94a3b8',
        'line-width': 3,
        'line-dasharray': [2, 1],
      },
    });
  }

  /** Adiciona a fonte e a camada dos veículos. */
  private addVehiclesLayer(): void {
    const map = this.map;

    if (!map || map.getSource(VEHICLES_SOURCE)) {
      return;
    }

    map.addSource(VEHICLES_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
      id: VEHICLES_LAYER,
      type: 'circle',
      source: VEHICLES_SOURCE,
      paint: {
        'circle-radius': 7,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-color': [
          'match',
          ['get', 'status'],
          'in_route',
          '#2563eb',
          'stopped',
          '#f59e0b',
          'fault',
          '#dc2626',
          'maintenance',
          '#7c3aed',
          '#64748b',
        ],
      },
    });

    map.on('click', VEHICLES_LAYER, (event) => {
      const feature = event.features?.[0];

      if (!feature || feature.geometry.type !== 'Point') {
        return;
      }

      const props = feature.properties as VehiclePositionMessage;
      new maplibregl.Popup()
        .setLngLat(feature.geometry.coordinates as [number, number])
        .setHTML(
          `<strong>${props.vehicle_id}</strong><br/>${props.status}<br/>${props.speed_kmh} km/h`,
        )
        .addTo(map);
    });
  }

  /**
   * Atualiza a fonte de veículos com as posições atuais.
   *
   * @param vehicles Posições conhecidas dos veículos.
   */
  private drawVehicles(vehicles: VehiclePositionMessage[]): void {
    const source = this.map?.getSource(VEHICLES_SOURCE) as GeoJSONSource | undefined;

    source?.setData({
      type: 'FeatureCollection',
      features: vehicles.map((vehicle) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [vehicle.lng, vehicle.lat] },
        properties: {
          vehicle_id: vehicle.vehicle_id,
          status: vehicle.status,
          speed_kmh: vehicle.speed_kmh,
          route_id: vehicle.route_id,
        },
      })),
    });
  }

  /**
   * Carrega as rotas cadastradas e desenha seus traçados no mapa.
   */
  private async loadRoutes(): Promise<void> {
    try {
      const routes = await this.routesService.list();
      this.drawRoutes(routes);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao carregar as rotas');
    }
  }

  /**
   * Atualiza a fonte de rotas com os traçados cadastrados.
   *
   * @param routes Rotas a desenhar.
   */
  private drawRoutes(routes: RouteDto[]): void {
    const source = this.map?.getSource(ROUTES_SOURCE) as GeoJSONSource | undefined;

    if (!source) {
      return;
    }

    source.setData({
      type: 'FeatureCollection',
      features: routes.map((route) => ({
        type: 'Feature',
        geometry: route.geometry,
        properties: { id: route.id, name: route.name, status: route.status },
      })),
    });
  }
}
