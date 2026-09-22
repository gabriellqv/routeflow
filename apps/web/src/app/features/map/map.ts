import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import type { RouteDto, VehicleDto, VehiclePositionMessage } from '@routeflow/contracts';
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import * as maplibregl from 'maplibre-gl';
import { MAP_STYLE_URL } from '../../core/api-config';
import { RealtimeService } from '../../core/realtime.service';
import { RoutesService } from '../routes/routes.service';
import { VehiclesService } from '../vehicles/vehicles.service';

// Configura o worker do MapLibre explicitamente para compatibilidade com o Vite / Angular dev server.
maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');

/** Nomes das camadas/fontes usadas no mapa. */
const VEHICLES_SOURCE = 'vehicles';
const VEHICLES_HALO_LAYER = 'vehicles-halo-layer';
const VEHICLES_LAYER = 'vehicles-layer';
const ROUTES_SOURCE = 'routes';
const ROUTES_LAYER = 'routes-layer';

/** Estilos vetoriais OpenMapTiles pré-configurados. */
const STYLE_POSITRON_PUBLIC = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const STYLE_DARK_MATTER_PUBLIC = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

/**
 * Limites geográficos do território brasileiro (Sudoeste e Nordeste).
 * Usado para restringir o mapa exclusivamente ao Brasil via `maxBounds`.
 */
const BRAZIL_BOUNDS: [[number, number], [number, number]] = [
  [-74.5, -34.5], // Sudoeste (fronteira oeste / sul)
  [-34.0, 5.5], // Nordeste (litoral leste / extremo norte)
];

/**
 * Centro inicial do mapa (São Paulo), coincidente com o seed de demonstração.
 */
const INITIAL_CENTER: [number, number] = [-46.6333, -23.5505];

/**
 * Mapa em tempo real com vector tiles OpenMapTiles (estilos Positron e Dark Matter).
 *
 * Renderiza o mapa base vetorial delimitado ao Brasil com as rotas traçadas sobre a malha
 * viária e os veículos recebidos via WebSocket, atualizando suas posições dinamicamente
 * e colorindo pelo status da máquina de estados.
 */
@Component({
  selector: 'app-map',
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class MapView implements OnInit, AfterViewInit {
  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
  private readonly realtime = inject(RealtimeService);
  private readonly routesService = inject(RoutesService);
  private readonly vehiclesService = inject(VehiclesService);
  private readonly configuredStyleUrl = inject(MAP_STYLE_URL);
  private readonly destroyRef = inject(DestroyRef);

  /** Instância do mapa (maplibre-gl). */
  private map?: MapLibreMap;

  /** Flag para evitar registro duplicado de listeners de interação após troca de estilo. */
  private interactionHandlersConfigured = false;

  /** Indica que o mapa carregou e está pronto para receber dados e camadas. */
  private readonly mapReady = signal(false);

  /** Estilo atualmente ativo no mapa. */
  protected readonly activeStyle = signal<'positron' | 'dark-matter'>('positron');

  /** Rotas carregadas da API. */
  private readonly routes = signal<RouteDto[]>([]);

  /** Catálogo de veículos para enriquecer a exibição com placas e modelos. */
  private readonly vehiclesCatalog = signal<Map<string, VehicleDto>>(new Map());

  /** Erro ao carregar os dados. */
  protected readonly error = signal<string | null>(null);

  /** Total de veículos monitorados com posição em tempo real. */
  protected readonly vehicleCount = computed(() => this.realtime.vehicles().size);

  /** Status da conexão em tempo real. */
  protected readonly connection = this.realtime.status;

  constructor() {
    // Redesenha as rotas sempre que o mapa estiver pronto ou as rotas mudarem.
    effect(() => {
      if (!this.mapReady()) {
        return;
      }
      const routes = this.routes();
      this.drawRoutes(routes);
      this.fitToRoutes(routes);
    });

    // Redesenha os veículos sempre que o mapa estiver pronto ou as posições mudarem.
    effect(() => {
      if (!this.mapReady()) {
        return;
      }
      const vehicles = [...this.realtime.vehicles().values()];
      this.drawVehicles(vehicles);
    });
  }

  ngOnInit(): void {
    this.realtime.connect();
    void this.loadData();
  }

  ngAfterViewInit(): void {
    this.createMap();
  }

  /**
   * Altera o estilo do mapa base entre Positron e Dark Matter.
   *
   * @param style Nome do estilo a aplicar.
   */
  protected setStyle(style: 'positron' | 'dark-matter'): void {
    if (this.activeStyle() === style || !this.map) {
      return;
    }
    this.activeStyle.set(style);
    const targetUrl = style === 'positron' ? this.configuredStyleUrl : STYLE_DARK_MATTER_PUBLIC;
    this.map.setStyle(targetUrl);
  }

  /** Cria o mapa base vetorial com limites restritos ao Brasil e registra as fontes/camadas. */
  private createMap(): void {
    const initialStyle = this.configuredStyleUrl || STYLE_POSITRON_PUBLIC;

    const map = new maplibregl.Map({
      container: this.container().nativeElement,
      style: initialStyle,
      center: INITIAL_CENTER,
      zoom: 11,
      minZoom: 4,
      maxZoom: 18,
      maxBounds: BRAZIL_BOUNDS,
      dragRotate: false,
      pitchWithRotate: false,
    });

    map.touchZoomRotate.disableRotation();

    let hasLoadedStyle = false;

    map.on('style.load', () => {
      hasLoadedStyle = true;
      this.setupLayersAndData();
    });

    map.on('error', (e) => {
      console.warn('[MapLibre]', e);
      // Caso a URL local (ex: localhost:8081) falhe por indisponibilidade do container, aplica fallback online
      if (!hasLoadedStyle && initialStyle !== STYLE_POSITRON_PUBLIC) {
        console.warn(
          `[MapLibre] Falha ao carregar estilo ${initialStyle}. Aplicando fallback: ${STYLE_POSITRON_PUBLIC}`,
        );
        hasLoadedStyle = true;
        map.setStyle(STYLE_POSITRON_PUBLIC);
      }
    });

    map.on('load', () => {
      this.fitToRoutes(this.routes());
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    this.map = map;

    this.destroyRef.onDestroy(() => {
      this.map?.remove();
      this.map = undefined;
    });
  }

  /** Registra as fontes e camadas de rotas e veículos após o carregamento do estilo. */
  private setupLayersAndData(): void {
    this.addRoutesLayer();
    this.addVehiclesLayer();
    this.drawRoutes(this.routes());
    this.drawVehicles([...this.realtime.vehicles().values()]);
    this.mapReady.set(true);
  }

  /** Adiciona a fonte e a camada das rotas. */
  private addRoutesLayer(): void {
    const map = this.map;
    if (!map) {
      return;
    }

    if (!map.getSource(ROUTES_SOURCE)) {
      map.addSource(ROUTES_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!map.getLayer(ROUTES_LAYER)) {
      map.addLayer({
        id: ROUTES_LAYER,
        type: 'line',
        source: ROUTES_SOURCE,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#2563eb',
          'line-width': 4,
          'line-opacity': 0.8,
        },
      });
    }
  }

  /** Adiciona as camadas dos veículos (halo e ponto central). */
  private addVehiclesLayer(): void {
    const map = this.map;
    if (!map) {
      return;
    }

    if (!map.getSource(VEHICLES_SOURCE)) {
      map.addSource(VEHICLES_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!map.getLayer(VEHICLES_HALO_LAYER)) {
      // Halo externo para destaque visual
      map.addLayer({
        id: VEHICLES_HALO_LAYER,
        type: 'circle',
        source: VEHICLES_SOURCE,
        paint: {
          'circle-radius': 18,
          'circle-opacity': 0.35,
          'circle-color': [
            'match',
            ['get', 'status'],
            'in_route',
            '#10b981',
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
    }

    if (!map.getLayer(VEHICLES_LAYER)) {
      // Marcador do veículo
      map.addLayer({
        id: VEHICLES_LAYER,
        type: 'circle',
        source: VEHICLES_SOURCE,
        paint: {
          'circle-radius': 9,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff',
          'circle-color': [
            'match',
            ['get', 'status'],
            'in_route',
            '#10b981',
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
    }

    if (!this.interactionHandlersConfigured) {
      this.interactionHandlersConfigured = true;
      this.setupInteractions(map);
    }
  }

  /** Configura interações de cursor e popups para os veículos. */
  private setupInteractions(map: MapLibreMap): void {
    // Feedback visual de cursor ao passar sobre veículos
    map.on('mouseenter', VEHICLES_LAYER, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', VEHICLES_LAYER, () => {
      map.getCanvas().style.cursor = '';
    });

    // Popup ao clicar em um veículo
    map.on('click', VEHICLES_LAYER, (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature || feature.geometry.type !== 'Point') {
        return;
      }

      const props = feature.properties as {
        vehicle_id: string;
        status: string;
        speed_kmh: number;
        route_id?: string;
        plate?: string;
        model?: string;
        route_name?: string;
      };

      const statusLabels: Record<string, string> = {
        in_route: 'Em rota',
        stopped: 'Parado',
        fault: 'Falha',
        maintenance: 'Manutenção',
        idle: 'Disponível',
      };

      const statusText = statusLabels[props.status] ?? props.status;
      const title = props.plate
        ? `${props.plate} — ${props.model || 'Veículo'}`
        : `Veículo ${props.vehicle_id.slice(0, 8)}`;

      new maplibregl.Popup({ closeButton: true, closeOnClick: true })
        .setLngLat(feature.geometry.coordinates as [number, number])
        .setHTML(
          `<div style="font-family: inherit; font-size: 13px; line-height: 1.45; padding: 2px;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">${title}</div>
            <div style="color: #475569;">
              <div>Status: <strong>${statusText}</strong></div>
              <div>Velocidade: <strong>${props.speed_kmh} km/h</strong></div>
              ${props.route_name ? `<div>Rota: <strong>${props.route_name}</strong></div>` : ''}
            </div>
          </div>`,
        )
        .addTo(map);
    });
  }

  /**
   * Atualiza a fonte de veículos com as posições atuais e metadados enriquecidos.
   *
   * @param vehicles Posições conhecidas dos veículos.
   */
  private drawVehicles(vehicles: VehiclePositionMessage[]): void {
    const source = this.map?.getSource(VEHICLES_SOURCE) as GeoJSONSource | undefined;
    if (!source) {
      return;
    }

    const catalog = this.vehiclesCatalog();
    const routesMap = new Map(this.routes().map((r) => [r.id, r.name]));

    source.setData({
      type: 'FeatureCollection',
      features: vehicles.map((vehicle) => {
        const details = catalog.get(vehicle.vehicle_id);
        const routeName = vehicle.route_id ? routesMap.get(vehicle.route_id) : undefined;

        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [vehicle.lng, vehicle.lat] },
          properties: {
            vehicle_id: vehicle.vehicle_id,
            status: vehicle.status,
            speed_kmh: Math.round(vehicle.speed_kmh),
            route_id: vehicle.route_id,
            plate: details?.plate ?? '',
            model: details?.model ?? '',
            route_name: routeName ?? '',
          },
        };
      }),
    });
  }

  /**
   * Carrega rotas e veículos cadastrados na API.
   */
  private async loadData(): Promise<void> {
    try {
      const [routes, vehicles] = await Promise.all([
        this.routesService.list(),
        this.vehiclesService.list().catch(() => [] as VehicleDto[]),
      ]);

      const catalog = new Map<string, VehicleDto>();
      for (const vehicle of vehicles) {
        catalog.set(vehicle.id, vehicle);
      }
      this.vehiclesCatalog.set(catalog);
      this.routes.set(routes);
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

  /**
   * Ajusta a visualização da câmera aos limites das rotas cadastradas.
   */
  private fitToRoutes(routes: RouteDto[]): void {
    const map = this.map;
    if (!map || routes.length === 0) {
      return;
    }

    const bounds = new maplibregl.LngLatBounds();
    for (const route of routes) {
      if (route.geometry?.coordinates) {
        for (const coord of route.geometry.coordinates) {
          bounds.extend(coord as [number, number]);
        }
      }
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    }
  }
}
