import { APIError } from 'better-auth/api';
import { openAPI, username } from 'better-auth/plugins';
import { BetterAuthOptions } from 'better-auth/types';
import {
  ProfileValidationError,
  validateProfileUpdate,
} from './profile-validation';

export const betterAuthCoreConfig: BetterAuthOptions = {
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'user',
        input: false,
      },
      bio: { type: 'string', required: false },
      defaultMood: { type: 'string', required: false },
    },
  },
  databaseHooks: {
    user: {
      update: {
        before: async (data) => {
          try {
            return { data: validateProfileUpdate(data) };
          } catch (error) {
            if (error instanceof ProfileValidationError) {
              throw APIError.from('BAD_REQUEST', {
                code: 'INVALID_PROFILE',
                message: error.message,
              });
            }
            throw error;
          }
        },
      },
    },
  },
  plugins: [openAPI(), username()],
};
