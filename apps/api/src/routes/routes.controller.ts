import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
