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
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { VehicleResponseDto } from './dto/vehicle-response.dto.js';
import { VehiclesService } from './vehicles.service.js';

/**
 * Controlador de veículos.
 *
 * Expõe o CRUD REST de veículos e a atribuição de motorista. Todas as rotas
 * são protegidas por autenticação JWT.
 */
@ApiTags('vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  /**
   * Lista todos os veículos.
   *
   * @returns Lista de veículos.
   */
  @Get()
  @ApiOperation({ summary: 'Lista os veículos' })
  @ApiResponse({ status: HttpStatus.OK, type: [VehicleResponseDto] })
  findAll(): Promise<VehicleResponseDto[]> {
    return this.vehiclesService.findAll();
  }

  /**
   * Retorna um veículo pelo identificador.
   *
   * @param id Identificador do veículo.
   * @returns O veículo solicitado.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Retorna um veículo pelo identificador' })
  @ApiResponse({ status: HttpStatus.OK, type: VehicleResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Veículo não encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<VehicleResponseDto> {
    return this.vehiclesService.findOne(id);
  }

  /**
   * Cria um novo veículo.
   *
   * @param dto Dados de criação.
   * @returns O veículo criado.
   */
  @Post()
  @ApiOperation({ summary: 'Cria um veículo' })
  @ApiResponse({ status: HttpStatus.CREATED, type: VehicleResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Placa já cadastrada' })
  create(@Body() dto: CreateVehicleDto): Promise<VehicleResponseDto> {
    return this.vehiclesService.create(dto);
  }

  /**
   * Atualiza parcialmente um veículo.
   *
   * @param id Identificador do veículo.
   * @param dto Campos a atualizar.
   * @returns O veículo atualizado.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um veículo' })
  @ApiResponse({ status: HttpStatus.OK, type: VehicleResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Veículo não encontrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.update(id, dto);
  }

  /**
   * Remove um veículo.
   *
   * @param id Identificador do veículo.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um veículo' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Veículo não encontrado' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.vehiclesService.remove(id);
  }
}
