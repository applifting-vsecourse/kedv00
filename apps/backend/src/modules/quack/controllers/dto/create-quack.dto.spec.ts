import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateQuackDto } from './create-quack.dto';

// Mirrors what the controller's ValidationPipe does with the request body.
const parse = async (
  body: Record<string, unknown>,
): Promise<{ dto: CreateQuackDto; errors: ValidationError[] }> => {
  const dto = plainToInstance(CreateQuackDto, body);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { dto, errors };
};

const withOptions = (options: unknown): Record<string, unknown> => ({
  text: 'Lunch?',
  poll: { options },
});

describe('CreateQuackDto poll', () => {
  it('accepts a quack without a poll', async () => {
    const { dto, errors } = await parse({ text: 'hello' });

    expect(errors).toHaveLength(0);
    expect(dto.poll).toBeUndefined();
  });

  it.each([
    ['2 answers', ['Pizza', 'Thai']],
    ['4 answers', ['Pizza', 'Thai', 'Salad', 'Sushi']],
    ['an 80 character answer', ['Pizza', 'a'.repeat(80)]],
  ])('accepts %s', async (_case, options) => {
    const { errors } = await parse(withOptions(options));

    expect(errors).toHaveLength(0);
  });

  it('trims the answers', async () => {
    const { dto, errors } = await parse(withOptions(['  Pizza ', 'Thai  ']));

    expect(errors).toHaveLength(0);
    expect(dto.poll?.options).toEqual(['Pizza', 'Thai']);
  });

  it.each([
    ['1 answer', ['Pizza']],
    ['5 answers', ['a', 'b', 'c', 'd', 'e']],
    ['an empty answer', ['Pizza', '']],
    ['a whitespace-only answer', ['Pizza', '   ']],
    ['an 81 character answer', ['Pizza', 'a'.repeat(81)]],
    ['duplicate answers', ['Pizza', 'Thai', 'Pizza']],
    ['answers differing only in case and spaces', ['Pizza', ' pizza ']],
    ['a non-string answer', ['Pizza', 3]],
    ['answers that are not a list', 'Pizza'],
  ])('rejects %s', async (_case, options) => {
    const { errors } = await parse(withOptions(options));

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('poll');
  });

  it('rejects unknown poll fields', async () => {
    const { errors } = await parse({
      text: 'Lunch?',
      poll: { options: ['Pizza', 'Thai'], closesAt: 'tomorrow' },
    });

    expect(errors).toHaveLength(1);
  });
});
