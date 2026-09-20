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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { DeliveriesService } from './deliveries.service.js';
import { CreateDeliveryDto } from './dto/create-delivery.dto.js';
import { DeliveryResponseDto } from './dto/delivery-response.dto.js';
import { UpdateDeliveryDto } from './dto/update-delivery.dto.js';

/**
 * Controlador de entregas.
 *
 * Expõe o CRUD REST de entregas (paradas de rota) e o filtro por rota. Todas as
 * rotas são protegidas por autenticação JWT.
 */
@ApiTags('deliveries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  /**
   * Lista todas as entregas, opcionalmente filtradas por rota.
   *
   * @param routeId Identificador da rota (query opcional).
   * @returns Lista de entregas.
   */
  @Get()
  @ApiOperation({ summary: 'Lista as entregas' })
  @ApiQuery({ name: 'route_id', required: false, format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: [DeliveryResponseDto] })
  findAll(
    @Query('route_id', new ParseUUIDPipe({ optional: true })) routeId?: string,
  ): Promise<DeliveryResponseDto[]> {
    return this.deliveriesService.findAll(routeId);
  }

  /**
   * Retorna uma entrega pelo identificador.
   *
   * @param id Identificador da entrega.
   * @returns A entrega solicitada.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Retorna uma entrega pelo identificador' })
  @ApiResponse({ status: HttpStatus.OK, type: DeliveryResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Entrega não encontrada' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DeliveryResponseDto> {
    return this.deliveriesService.findOne(id);
  }

  /**
   * Cria uma nova entrega.
   *
   * @param dto Dados de criação.
   * @returns A entrega criada.
   */
  @Post()
  @ApiOperation({ summary: 'Cria uma entrega' })
  @ApiResponse({ status: HttpStatus.CREATED, type: DeliveryResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Ordem já usada na rota' })
  create(@Body() dto: CreateDeliveryDto): Promise<DeliveryResponseDto> {
    return this.deliveriesService.create(dto);
  }

  /**
   * Atualiza parcialmente uma entrega.
   *
   * @param id Identificador da entrega.
   * @param dto Campos a atualizar.
   * @returns A entrega atualizada.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma entrega' })
  @ApiResponse({ status: HttpStatus.OK, type: DeliveryResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Entrega não encontrada' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryDto,
  ): Promise<DeliveryResponseDto> {
    return this.deliveriesService.update(id, dto);
  }

  /**
   * Remove uma entrega.
   *
   * @param id Identificador da entrega.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove uma entrega' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Entrega não encontrada' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.deliveriesService.remove(id);
  }
}
