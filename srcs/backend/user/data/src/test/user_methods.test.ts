import { expect, test } from 'vitest'
import * as User from '../user_methods'


test('receive register request in correct format', () => {
    const mockUser: User.UserRegister = {
        username: "testuser",
        email: "testemail@gmail.com",
        password: "testpassword"
    }

  expect(User.user_register(mockUser)).toBe(mockUser)
})
