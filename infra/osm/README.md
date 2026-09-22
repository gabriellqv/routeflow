# Infraestrutura de Dados Geoespaciais (OpenStreetMap & Map Tiles)

Este diretório armazena os arquivos de dados geográficos locais para o motor de rotas **Valhalla** e o servidor de mapas vetoriais **TileServer GL**.

---

## 1. Extrato do OpenStreetMap (São Paulo)

O Valhalla utiliza o extrato em formato `.osm.pbf` para compilar o grafo viário de roteamento.

### Como baixar o extrato de São Paulo:

Baixe o arquivo da Geofabrik diretamente para a pasta `infra/osm/`:

```bash
# Linux / macOS (curl ou wget)
curl -o infra/osm/sao-paulo-latest.osm.pbf https://download.geofabrik.de/south-america/brazil/sudeste-latest.osm.pbf

# Ou baixe especificamente o extrato do estado de São Paulo:
curl -o infra/osm/sao-paulo-latest.osm.pbf https://download.geofabrik.de/south-america/brazil/sao-paulo-latest.osm.pbf
```

O container `routeflow-valhalla` montará `./infra/osm` e compilará os grafos de roteamento no volume `valhalla_data` na primeira inicialização.

---

## 2. Vector Tiles (OpenMapTiles / MBTiles)

O servidor de tiles vetoriais (`tileserver-gl-light`) consome arquivos `.mbtiles` com o esquema OpenMapTiles (ex.: estilo Positron).

### Como obter ou gerar o `.mbtiles`:

1. **Download pré-compilado**:
   - Faça download de um extrato `.mbtiles` da região de São Paulo ou Brasil em fontes abertas (como [OpenMapTiles Downloads](https://openmaptiles.org/downloads/) ou [DataHub OpenMapTiles](https://data.maptiler.com/downloads/planet/)).
   - Salve o arquivo em `infra/tiles/sao-paulo.mbtiles`.

2. **Geração manual (osm2pgsql + openmaptiles tools)**:
   ```bash
   git clone https://github.com/openmaptiles/openmaptiles.git
   cd openmaptiles
   ./quickstart.sh sao-paulo
   # Copie o arquivo gerado para o RouteFlow:
   cp build/tiles.mbtiles /caminho/do/RouteFlow/infra/tiles/sao-paulo.mbtiles
   ```
