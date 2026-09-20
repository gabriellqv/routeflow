import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

/**
 * Valida se o valor é um GeoJSON `Point` bem formado.
 *
 * Exige `coordinates` no formato `[lng, lat]` com números finitos.
 */
@ValidatorConstraint({ name: 'isPoint', async: false })
export class IsPointConstraint implements ValidatorConstraintInterface {
  /**
   * Verifica o formato do GeoJSON.
   *
   * @param value Valor recebido.
   * @returns `true` quando é um `Point` válido.
   */
  validate(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const geometry = value as { type?: unknown; coordinates?: unknown };
    if (geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) {
      return false;
    }

    const coordinates = geometry.coordinates;
    return (
      coordinates.length === 2 &&
      coordinates.every(
        (coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate),
      )
    );
  }

  /**
   * Mensagem padrão de erro.
   *
   * @param args Argumentos da validação.
   * @returns Mensagem de erro.
   */
  defaultMessage(args: ValidationArguments): string {
    return `${args.property} deve ser um GeoJSON Point no formato [lng, lat]`;
  }
}

/**
 * Decorador que valida um GeoJSON `Point`.
 *
 * @param validationOptions Opções de validação do class-validator.
 * @returns Decorador de propriedade.
 */
export function IsPoint(validationOptions?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'isPoint',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: IsPointConstraint,
    });
  };
}
