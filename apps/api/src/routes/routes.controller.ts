import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFloatPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { NearbyRouteDto, RouteMetricsDto } from '@routeflow/contracts';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateRouteDto } from './dto/create-route.dto.js';
import { RouteResponseDto } from './dto/route-response.dto.js';
import { UpdateRouteDto } from './dto/update-route.dto.js';
import { RoutesService } from './routes.service.js';

/**
 * Controlador de rotas.
 *
 * Expõe o CRUD REST de rotas com geometria PostGIS e a atribuição de veículo.
 * Todas as rotas são protegidas por autenticação JWT.
 */
@ApiTags('routes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  /**
   * Lista todas as rotas.
   *
   * @returns Lista de rotas.
   */
  @Get()
  @ApiOperation({ summary: 'Lista as rotas' })
  @ApiResponse({ status: HttpStatus.OK, type: [RouteResponseDto] })
  findAll(): Promise<RouteResponseDto[]> {
    return this.routesService.findAll();
  }

  /**
   * Lista rotas dentro de um raio de um ponto (PostGIS `ST_DWithin`).
   *
   * @param lng Longitude do ponto de referência.
   * @param lat Latitude do ponto de referência.
   * @param radiusM Raio de busca em metros.
   * @returns Rotas próximas, com a distância mínima em metros.
   */
  @Get('nearby')
  @ApiOperation({ summary: 'Lista rotas próximas de um ponto' })
  @ApiQuery({ name: 'lng', type: Number, example: -46.6333 })
  @ApiQuery({ name: 'lat', type: Number, example: -23.5505 })
  @ApiQuery({ name: 'radius_m', type: Number, example: 1000 })
  @ApiResponse({ status: HttpStatus.OK })
  findNearby(
    @Query('lng', new ParseFloatPipe()) lng: number,
    @Query('lat', new ParseFloatPipe()) lat: number,
    @Query('radius_m', new ParseFloatPipe({ optional: true })) radiusM?: number,
  ): Promise<NearbyRouteDto[]> {
    return this.routesService.findNearby(lng, lat, radiusM ?? 1000);
  }

  /**
   * Retorna métricas de uma rota (comprimento em metros).
   *
   * @param id Identificador da rota.
   * @returns Métricas da rota.
   */
  @Get(':id/metrics')
  @ApiOperation({ summary: 'Retorna as métricas de uma rota' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Rota não encontrada' })
  getMetrics(@Param('id', ParseUUIDPipe) id: string): Promise<RouteMetricsDto> {
    return this.routesService.getMetrics(id);
  }

  /**
   * Retorna uma rota pelo identificador.
   *
   * @param id Identificador da rota.
   * @returns A rota solicitada.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Retorna uma rota pelo identificador' })
  @ApiResponse({ status: HttpStatus.OK, type: RouteResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Rota não encontrada' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RouteResponseDto> {
    return this.routesService.findOne(id);
  }

  /**
   * Cria uma nova rota.
   *
   * @param dto Dados de criação.
   * @returns A rota criada.
   */
  @Post()
  @ApiOperation({ summary: 'Cria uma rota' })
  @ApiResponse({ status: HttpStatus.CREATED, type: RouteResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Veículo já possui rota atribuída' })
  create(@Body() dto: CreateRouteDto): Promise<RouteResponseDto> {
    return this.routesService.create(dto);
  }

  /**
   * Atualiza parcialmente uma rota.
   *
   * @param id Identificador da rota.
   * @param dto Campos a atualizar.
   * @returns A rota atualizada.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma rota' })
  @ApiResponse({ status: HttpStatus.OK, type: RouteResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Rota não encontrada' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRouteDto,
  ): Promise<RouteResponseDto> {
    return this.routesService.update(id, dto);
  }

  /**
   * Remove uma rota.
   *
   * @param id Identificador da rota.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove uma rota' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Rota não encontrada' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.routesService.remove(id);
  }
}
