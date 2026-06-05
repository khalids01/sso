import prisma from "@db/server";
import { hasPlatformOwner } from "@db/server/rbac/assignments";
import { randomUUID } from "node:crypto";
import { Roles } from "@rbac";
import { assignUserRoleAndInvalidate } from "@/rbac/assignments";
import type { CreateOwner } from "./owner.dto";

export class OwnerService {
    async hasOwner() {
        return hasPlatformOwner();
    }

    async createOwner(data: CreateOwner) {
        const ownerExists = await this.hasOwner();
        if (ownerExists) {
            throw new Error("Owner already exists");
        }

        const existingUser = await prisma.user.findUnique({
            where: {
                email: data.email,
            },
        });

        if (existingUser) {
            throw new Error("A user with this email already exists");
        }

        const owner = await prisma.user.create({
            data: {
                id: randomUUID(),
                email: data.email,
                name: data.name,
            },
        });

        await assignUserRoleAndInvalidate(owner.id, Roles.PlatformOwner);

        return owner;
    }
}
