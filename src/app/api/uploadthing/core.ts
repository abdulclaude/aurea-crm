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
  instructorProfilePhoto: f({
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
      console.log("[UT] instructor profile photo upload complete", {
        userId: metadata.userId,
        url: file.ufsUrl,
        key: file.key,
      });
      return { url: file.ufsUrl };
    }),
  instructorDocument: f({
    pdf: {
      maxFileSize: "16MB",
      maxFileCount: 1,
    },
    image: {
      maxFileSize: "16MB",
      maxFileCount: 1,
    },
    "application/msword": {
      maxFileSize: "16MB",
      maxFileCount: 1,
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "16MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      // Allow anyone for now; wire to real auth later
      const user = await auth();
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[UT] instructor document upload complete", {
        userId: metadata.userId,
        url: file.ufsUrl,
        key: file.key,
        fileName: file.name,
        fileSize: file.size,
      });
      return {
        url: file.ufsUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      };
    }),
  mindbodyImportFile: f({
    blob: {
      maxFileSize: "512MB",
      maxFileCount: 250,
    },
  })
    .middleware(async () => {
      const user = await auth();
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[UT] Mindbody import file upload complete", {
        userId: metadata.userId,
        url: file.ufsUrl,
        key: file.key,
        fileName: file.name,
        fileSize: file.size,
      });
      return {
        url: file.ufsUrl,
        uploadKey: file.key,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      };
    }),
  invoiceDocument: f({
    pdf: {
      maxFileSize: "16MB",
      maxFileCount: 1,
    },
    image: {
      maxFileSize: "16MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      // Allow anyone for now; wire to real auth later
      const user = await auth();
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[UT] invoice document upload complete", {
        userId: metadata.userId,
        url: file.ufsUrl,
        key: file.key,
        fileName: file.name,
        fileSize: file.size,
      });
      return {
        url: file.ufsUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
