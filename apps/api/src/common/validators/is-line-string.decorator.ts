import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

/**
 * Valida se o valor é um GeoJSON `LineString` bem formado.
 *
 * Exige um array de ao menos 2 coordenadas, cada uma no formato `[lng, lat]`
 * com números finitos.
 */
@ValidatorConstraint({ name: 'isLineString', async: false })
export class IsLineStringConstraint implements ValidatorConstraintInterface {
  /**
   * Verifica o formato do GeoJSON.
   *
   * @param value Valor recebido.
   * @returns `true` quando é um `LineString` válido.
   */
  validate(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const geometry = value as { type?: unknown; coordinates?: unknown };
    if (geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates)) {
      return false;
    }

    const coordinates = geometry.coordinates;
    if (coordinates.length < 2) {
      return false;
    }

    return coordinates.every(
      (pair) =>
        Array.isArray(pair) &&
        pair.length === 2 &&
        pair.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate)),
    );
  }

  /**
   * Mensagem padrão de erro.
   *
   * @param args Argumentos da validação.
   * @returns Mensagem de erro.
   */
  defaultMessage(args: ValidationArguments): string {
    return `${args.property} deve ser um GeoJSON LineString com ao menos 2 coordenadas [lng, lat]`;
  }
}

/**
 * Decorador que valida um GeoJSON `LineString`.
 *
 * @param validationOptions Opções de validação do class-validator.
 * @returns Decorador de propriedade.
 */
export function IsLineString(validationOptions?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'isLineString',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: IsLineStringConstraint,
    });
  };
}
