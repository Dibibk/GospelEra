import { setupServer } from 'msw/node'
import { handlers } from '../../mocks/handlers'
import { mobileHandlers } from './handlers'

// This configures a request mocking server with both web and mobile handlers
export const mobileServer = setupServer(...handlers, ...mobileHandlers)