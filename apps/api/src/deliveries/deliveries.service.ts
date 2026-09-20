import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { DeliveryStatus } from '@routeflow/contracts';
import { toDeliveryResponse } from '../common/mappers.js';
import { Route } from '../routes/route.entity.js';
import { CreateDeliveryDto } from './dto/create-delivery.dto.js';
import { DeliveryResponseDto } from './dto/delivery-response.dto.js';
import { UpdateDeliveryDto } from './dto/update-delivery.dto.js';
import { Delivery } from './delivery.entity.js';

/**
 * Serviço de entregas.
 *
 * Concentra o CRUD, a unicidade da ordem na rota e a marcação automática de
 * `delivered_at` quando o status passa para `done`.
 */
@Injectable()
export class DeliveriesService {
  constructor(
    @InjectRepository(Delivery) private readonly repository: Repository<Delivery>,
    @InjectRepository(Route) private readonly routeRepository: Repository<Route>,
  ) {}

  /**
   * Lista todas as entregas, opcionalmente filtradas por rota.
   *
   * @param routeId Identificador da rota para filtrar (opcional).
   * @returns Entregas convertidas para o DTO de resposta.
   */
  async findAll(routeId?: string): Promise<DeliveryResponseDto[]> {
    const deliveries = await this.repository.find({
      where: routeId ? { routeId } : {},
      order: { routeId: 'ASC', order: 'ASC' },
    });
    return deliveries.map(toDeliveryResponse);
  }

  /**
   * Busca uma entrega pelo identificador.
   *
   * @param id Identificador da entrega.
   * @returns DTO de resposta da entrega.
   * @throws NotFoundException Quando a entrega não existe.
   */
  async findOne(id: string): Promise<DeliveryResponseDto> {
    return toDeliveryResponse(await this.getOrFail(id));
  }

  /**
   * Cria uma nova entrega.
   *
   * @param dto Dados de criação.
   * @returns DTO de resposta da entrega criada.
   * @throws NotFoundException Quando a rota informada não existe.
   * @throws ConflictException Quando já existe entrega na mesma ordem da rota.
   */
  async create(dto: CreateDeliveryDto): Promise<DeliveryResponseDto> {
    await this.ensureRouteExists(dto.route_id);
    await this.ensureOrderIsUnique(dto.route_id, dto.order);

    const saved = await this.repository.save(
      this.repository.create({
        routeId: dto.route_id,
        order: dto.order,
        geolocation: dto.geolocation,
        address: dto.address,
        status: dto.status ?? DeliveryStatus.Pending,
      }),
    );

    return this.findOne(saved.id);
  }

  /**
   * Atualiza parcialmente uma entrega.
   *
   * @param id Identificador da entrega.
   * @param dto Campos a atualizar.
   * @returns DTO de resposta da entrega atualizada.
   * @throws NotFoundException Quando a entrega não existe.
   * @throws ConflictException Quando a nova ordem já está em uso na rota.
   */
  async update(id: string, dto: UpdateDeliveryDto): Promise<DeliveryResponseDto> {
    const delivery = await this.getOrFail(id);

    if (dto.order !== undefined && dto.order !== delivery.order) {
      await this.ensureOrderIsUnique(delivery.routeId, dto.order, id);
      delivery.order = dto.order;
    }

    if (dto.geolocation !== undefined) delivery.geolocation = dto.geolocation;
    if (dto.address !== undefined) delivery.address = dto.address;

    if (dto.status !== undefined && dto.status !== delivery.status) {
      delivery.status = dto.status;
      delivery.deliveredAt =
        dto.status === DeliveryStatus.Done ? (delivery.deliveredAt ?? new Date()) : null;
    }

    await this.repository.save(delivery);
    return this.findOne(id);
  }

  /**
   * Remove uma entrega.
   *
   * @param id Identificador da entrega.
   * @throws NotFoundException Quando a entrega não existe.
   */
  async remove(id: string): Promise<void> {
    const delivery = await this.getOrFail(id);
    await this.repository.remove(delivery);
  }

  /**
   * Busca a entidade da entrega ou lança `NotFoundException`.
   *
   * @param id Identificador da entrega.
   * @returns A entidade da entrega.
   * @throws NotFoundException Quando a entrega não existe.
   */
  private async getOrFail(id: string): Promise<Delivery> {
    const delivery = await this.repository.findOne({ where: { id } });
    if (!delivery) {
      throw new NotFoundException('Entrega não encontrada');
    }
    return delivery;
  }

  /**
   * Garante que a rota referenciada existe.
   *
   * @param routeId Identificador da rota.
   * @throws NotFoundException Quando a rota não existe.
   */
  private async ensureRouteExists(routeId: string): Promise<void> {
    const route = await this.routeRepository.findOne({ where: { id: routeId } });
    if (!route) {
      throw new NotFoundException('Rota não encontrada');
    }
  }

  /**
   * Garante que não há outra entrega na mesma ordem da rota.
   *
   * @param routeId Identificador da rota.
   * @param order Ordem a verificar.
   * @param ignoreId Identificador a ignorar na verificação (na atualização).
   * @throws ConflictException Quando a ordem já está em uso.
   */
  private async ensureOrderIsUnique(
    routeId: string,
    order: number,
    ignoreId?: string,
  ): Promise<void> {
    const where = ignoreId ? { routeId, order, id: Not(ignoreId) } : { routeId, order };
    const existing = await this.repository.findOne({ where });
    if (existing) {
      throw new ConflictException('Já existe uma entrega nessa ordem para a rota');
    }
  }
}
