import {
  QUACK_SEARCH_MAX_LENGTH,
  QUACK_SEARCH_MIN_LENGTH,
} from '@/modules/quack/domain/quack';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches } from 'class-validator';

// MinLength/MaxLength count an emoji as one character, the frontend counts it
// as two (JS string length). Matching on UTF-16 units keeps both sides in step,
// so the client never sends a term the server then rejects.
const SEARCH_LENGTH_PATTERN = new RegExp(
  `^[\\s\\S]{${QUACK_SEARCH_MIN_LENGTH},${QUACK_SEARCH_MAX_LENGTH}}$`,
);

export class ListQuacksQueryDto {
  @ApiPropertyOptional({
    description:
      'Only return quacks whose text or author name contains this term (case-insensitive). Surrounding whitespace is ignored.',
    example: 'pond',
    minLength: QUACK_SEARCH_MIN_LENGTH,
    maxLength: QUACK_SEARCH_MAX_LENGTH,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Matches(SEARCH_LENGTH_PATTERN, {
    message: `q must be between ${QUACK_SEARCH_MIN_LENGTH} and ${QUACK_SEARCH_MAX_LENGTH} characters long`,
  })
  q?: string;
}
