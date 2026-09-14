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
import { CreateDriverDto } from './dto/create-driver.dto.js';
import { DriverResponseDto } from './dto/driver-response.dto.js';
import { UpdateDriverDto } from './dto/update-driver.dto.js';
import { DriversService } from './drivers.service.js';

/**
 * Controlador de motoristas.
 *
 * Expõe o CRUD REST de motoristas. Todas as rotas são protegidas por
 * autenticação JWT.
 */
@ApiTags('drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  /**
   * Lista todos os motoristas.
   *
   * @returns Lista de motoristas.
   */
  @Get()
  @ApiOperation({ summary: 'Lista os motoristas' })
  @ApiResponse({ status: HttpStatus.OK, type: [DriverResponseDto] })
  findAll(): Promise<DriverResponseDto[]> {
    return this.driversService.findAll();
  }

  /**
   * Retorna um motorista pelo identificador.
   *
   * @param id Identificador do motorista.
   * @returns O motorista solicitado.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Retorna um motorista pelo identificador' })
  @ApiResponse({ status: HttpStatus.OK, type: DriverResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Motorista não encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DriverResponseDto> {
    return this.driversService.findOne(id);
  }

  /**
   * Cria um novo motorista.
   *
   * @param dto Dados de criação.
   * @returns O motorista criado.
   */
  @Post()
  @ApiOperation({ summary: 'Cria um motorista' })
  @ApiResponse({ status: HttpStatus.CREATED, type: DriverResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'CNH já cadastrada' })
  create(@Body() dto: CreateDriverDto): Promise<DriverResponseDto> {
    return this.driversService.create(dto);
  }

  /**
   * Atualiza parcialmente um motorista.
   *
   * @param id Identificador do motorista.
   * @param dto Campos a atualizar.
   * @returns O motorista atualizado.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um motorista' })
  @ApiResponse({ status: HttpStatus.OK, type: DriverResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Motorista não encontrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverDto,
  ): Promise<DriverResponseDto> {
    return this.driversService.update(id, dto);
  }

  /**
   * Remove um motorista.
   *
   * @param id Identificador do motorista.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um motorista' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Motorista não encontrado' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.driversService.remove(id);
  }
}
