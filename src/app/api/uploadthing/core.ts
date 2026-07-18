import { createUploadthing, type FileRouter } from "uploadthing/next";

import { authorizeUploadRequest } from "@/features/uploads/upload-authorization";
import { createUploadReceipt } from "@/features/uploads/upload-receipt";

const f = createUploadthing();

export const uploadRouter = {
  orgLogo: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(({ req }) => authorizeUploadRequest(req, "orgLogo"))
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),
  profilePicture: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(({ req }) => authorizeUploadRequest(req, "profilePicture"))
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),
  workspaceLogo: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(({ req }) => authorizeUploadRequest(req, "workspaceLogo"))
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),
  instructorProfilePhoto: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(({ req }) =>
      authorizeUploadRequest(req, "instructorProfilePhoto"),
    )
    .onUploadComplete(async ({ file }) => {
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
    .middleware(({ req }) => authorizeUploadRequest(req, "instructorDocument"))
    .onUploadComplete(async ({ file }) => {
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
    .middleware(({ req }) => authorizeUploadRequest(req, "mindbodyImportFile"))
    .onUploadComplete(async ({ file }) => {
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
    .middleware(({ req }) => authorizeUploadRequest(req, "invoiceDocument"))
    .onUploadComplete(async ({ file }) => {
      return {
        url: file.ufsUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      };
    }),
  waiverDocument: f({
    pdf: {
      maxFileSize: "16MB",
      maxFileCount: 1,
    },
  })
    .middleware(({ req }) => authorizeUploadRequest(req, "waiverDocument"))
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        url: file.ufsUrl,
        uploadKey: file.key,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadReceipt: createUploadReceipt({
          key: file.key,
          locationId: metadata.locationId,
          organizationId: metadata.organizationId ?? "",
          route: "waiverDocument",
          url: file.ufsUrl,
          userId: metadata.userId,
        }),
      };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
