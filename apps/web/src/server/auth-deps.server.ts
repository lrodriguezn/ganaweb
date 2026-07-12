import { createHash, randomBytes } from "node:crypto"
import { DrizzleAuthRepository } from "@ganaweb/db/auth-repository"
import { db } from "@ganaweb/db/client"
import argon2 from "argon2"

class Argon2idPasswordHasher {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id })
  }

  async verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password)
  }
}

export function getAuthDeps() {
  return {
    repo: new DrizzleAuthRepository(db),
    passwordHasher: new Argon2idPasswordHasher(),
    tokens: {
      crearToken: () => randomBytes(32).toString("base64url"),
      hashToken: (token: string) => createHash("sha256").update(token).digest("hex"),
    },
  }
}
