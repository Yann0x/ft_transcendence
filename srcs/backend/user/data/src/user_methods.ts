import { UserRegister } from "./shared/types/user"

export function user_register(data: UserRegister) {
  console.log("User registration request reeived :", data)
  return data 
}
