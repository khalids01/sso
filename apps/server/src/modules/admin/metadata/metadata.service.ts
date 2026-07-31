import prisma from "@sso/db/server";

export const metadataService = {
    async getOverview() {
        const totalUsers = await prisma.user.count({
            where: {
                archived: false,
            },
        });

        return {
            totalUsers,
        };
    },
};
