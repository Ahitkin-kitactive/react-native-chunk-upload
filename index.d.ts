export as namespace ChunkUploadLib;

export = ChunkUpload;

declare class ChunkUpload {
  constructor(props: ChunkUpload.Props);

  digIn(Event: ChunkUpload.Event): void;
}

declare namespace ChunkUpload {
    export interface Props {
        path: string;
        size: number;
        fileName: string;
        fileSize: number;
        fileType: string;
    }

    export type Event = (
        file: File,
        next: () => void,
        retry: () => void,
        unlink: (path: string) => void
    ) => void;

    export interface File {
        path: string;
        headers: Header;
        blob: Blob;
        type: string;
    }

    export interface Header {
        "resumableChunkNumber": number;
        "resumableTotalChunks": number;
        "resumableChunkSize": number;
        "resumableFilename": string;
        "resumableTotalSize": number;
        "resumableIdentifier": string;
        "resumableCurrentChunkSize": string;
        "resumableType": string;
    }

    export interface Blob {
        name: string;
        type: string;
        uri: string;
    }
}
