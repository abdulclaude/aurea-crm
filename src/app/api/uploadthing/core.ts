import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

const auth = async () => ({ id: "public" }); // Simple auth for now

// FileRouter for your app, can contain multiple FileRoutes
export const uploadRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  orgLogo: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      // Allow anyone for now; wire to real auth later
      const user = await auth();
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[UT] upload complete", {
        userId: metadata.userId,
        url: file.ufsUrl,
        key: file.key,
      });
      return { url: file.ufsUrl };
    }),
  profilePicture: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      // Allow anyone for now; wire to real auth later
      const user = await auth();
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[UT] profile picture upload complete", {
        userId: metadata.userId,
        url: file.ufsUrl,
        key: file.key,
      });
      return { url: file.ufsUrl };
    }),
  workspaceLogo: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      // Allow anyone for now; wire to real auth later
      const user = await auth();
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[UT] workspace logo upload complete", {
        userId: metadata.userId,
        url: file.ufsUrl,
        key: file.key,
      });
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
