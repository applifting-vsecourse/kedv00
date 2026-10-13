import { Poll } from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';

class PollOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ description: 'How many people picked this answer' })
  votes!: number;
}

export class PollResponseDto {
  @ApiProperty({
    type: [PollOptionResponseDto],
    description: 'In the order the asker entered them',
  })
  options!: PollOptionResponseDto[];

  @ApiProperty()
  totalVotes!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "The signed-in user's own pick, or null if they haven't voted",
  })
  myOptionId!: string | null;

  static fromDomain(poll: Poll): PollResponseDto {
    return {
      options: poll.options.map((option) => ({
        id: option.id,
        text: option.text,
        votes: option.votes,
      })),
      totalVotes: poll.totalVotes,
      myOptionId: poll.myOptionId,
    };
  }
}
