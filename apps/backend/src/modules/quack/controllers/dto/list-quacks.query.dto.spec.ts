import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ListQuacksQueryDto } from './list-quacks.query.dto';

// Mirrors what the controller's ValidationPipe does with `?q=...`.
const parse = async (
  query: Record<string, unknown>,
): Promise<{ dto: ListQuacksQueryDto; errors: ValidationError[] }> => {
  const dto = plainToInstance(ListQuacksQueryDto, query);
  const errors = await validate(dto);
  return { dto, errors };
};

describe('ListQuacksQueryDto', () => {
  it('accepts a missing term', async () => {
    const { dto, errors } = await parse({});

    expect(errors).toHaveLength(0);
    expect(dto.q).toBeUndefined();
  });

  it('trims the term', async () => {
    const { dto, errors } = await parse({ q: '  duck  ' });

    expect(errors).toHaveLength(0);
    expect(dto.q).toBe('duck');
  });

  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
    ['one character after trimming', ' d '],
    ['longer than 100 characters', 'd'.repeat(101)],
    ['repeated', ['duck', 'pond']],
  ])('rejects a term that is %s', async (_case, q) => {
    const { errors } = await parse({ q });

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('q');
  });

  it.each([
    ['2 characters', 'du'],
    ['100 characters', 'd'.repeat(100)],
    // one emoji is two UTF-16 units, the same length the frontend counts
    ['a single emoji', '🦆'],
  ])('accepts a term of %s', async (_case, q) => {
    const { errors } = await parse({ q });

    expect(errors).toHaveLength(0);
  });
});
