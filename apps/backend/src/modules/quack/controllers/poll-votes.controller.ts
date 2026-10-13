import { PollsService } from '@/modules/quack/services/polls.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Delete,
  Param,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PollResponseDto } from './dto/poll.response.dto';
import { VoteDto } from './dto/vote.dto';

@ApiTags('quacks')
@Controller('quacks/:quackId/vote')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class PollVotesController {
  constructor(private readonly pollsService: PollsService) {}

  @Put()
  @ApiOperation({
    summary: 'Vote in a poll, or move your vote to another answer',
  })
  @ApiResponse({ status: 200, type: PollResponseDto })
  @ApiResponse({ status: 400, description: 'Answer is not part of this poll' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Quack not found or not a poll' })
  async vote(
    @User() user: Identity,
    @Param('quackId') quackId: string,
    @Body() body: VoteDto,
  ): Promise<PollResponseDto> {
    const poll = await this.pollsService.vote(user, quackId, body.optionId);
    return PollResponseDto.fromDomain(poll);
  }

  @Delete()
  @ApiOperation({ summary: 'Take back your vote in a poll' })
  @ApiResponse({ status: 200, type: PollResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Quack not found or not a poll' })
  async removeVote(
    @User() user: Identity,
    @Param('quackId') quackId: string,
  ): Promise<PollResponseDto> {
    const poll = await this.pollsService.removeVote(user, quackId);
    return PollResponseDto.fromDomain(poll);
  }
}
