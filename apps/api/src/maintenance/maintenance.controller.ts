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
import { CreateMaintenanceDto } from './dto/create-maintenance.dto.js';
import { MaintenanceResponseDto } from './dto/maintenance-response.dto.js';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto.js';
import { MaintenanceService } from './maintenance.service.js';

/**
 * Controlador de manutenções.
 *
 * Expõe o CRUD REST de manutenções e o filtro por veículo. Todas as rotas são
 * protegidas por autenticação JWT.
 */
@ApiTags('maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  /**
   * Lista todas as manutenções, opcionalmente filtradas por veículo.
   *
   * @param vehicleId Identificador do veículo (query opcional).
   * @returns Lista de manutenções.
   */
  @Get()
  @ApiOperation({ summary: 'Lista as manutenções' })
  @ApiQuery({ name: 'vehicle_id', required: false, format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: [MaintenanceResponseDto] })
  findAll(
    @Query('vehicle_id', new ParseUUIDPipe({ optional: true })) vehicleId?: string,
  ): Promise<MaintenanceResponseDto[]> {
    return this.maintenanceService.findAll(vehicleId);
  }

  /**
   * Retorna uma manutenção pelo identificador.
   *
   * @param id Identificador da manutenção.
   * @returns A manutenção solicitada.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Retorna uma manutenção pelo identificador' })
  @ApiResponse({ status: HttpStatus.OK, type: MaintenanceResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Manutenção não encontrada' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<MaintenanceResponseDto> {
    return this.maintenanceService.findOne(id);
  }

  /**
   * Cria uma nova manutenção.
   *
   * @param dto Dados de criação.
   * @returns A manutenção criada.
   */
  @Post()
  @ApiOperation({ summary: 'Cria uma manutenção' })
  @ApiResponse({ status: HttpStatus.CREATED, type: MaintenanceResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Veículo não encontrado' })
  create(@Body() dto: CreateMaintenanceDto): Promise<MaintenanceResponseDto> {
    return this.maintenanceService.create(dto);
  }

  /**
   * Atualiza parcialmente uma manutenção.
   *
   * @param id Identificador da manutenção.
   * @param dto Campos a atualizar.
   * @returns A manutenção atualizada.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma manutenção' })
  @ApiResponse({ status: HttpStatus.OK, type: MaintenanceResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Manutenção não encontrada' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Transição de status inválida' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenanceDto,
  ): Promise<MaintenanceResponseDto> {
    return this.maintenanceService.update(id, dto);
  }

  /**
   * Remove uma manutenção.
   *
   * @param id Identificador da manutenção.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove uma manutenção' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Manutenção não encontrada' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.maintenanceService.remove(id);
  }
}
