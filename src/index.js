import RNFetchBlob from 'rn-fetch-blob';
import RNFS from 'react-native-fs';

class ChunkUpload {
    constructor(props) {
        this.data = {
            path: String(props.path),
            sparePath: String(props.sparePath),
            size: parseInt(props.size),
            fileName: String(props.fileName),
            fileSize: parseInt(props.fileSize),
            fileIdentity: this.generateFileIdentity(),
            fileShortId: null,
            destinationPath: RNFS.TemporaryDirectoryPath,
            totalNumber: 0
        };

        this.chunks = [];
        this.level = 0;
        this.file = null;
        this.fileType = props.fileType;
        this.isRetried = false
        this.files = []

        this.data.fileShortId = this.data.fileIdentity.substr(0, 10);
        this.data.totalNumber = this.getTotalNumber();

        // Errors
        this.onFetchBlobError = props.onFetchBlobError;
        this.onWriteFileError = props.onWriteFileError;
    }

    digIn(event = () => {}, files) {
        this.event = event;
        this.files = files
        this.getBase64Chunks();
    }

    async getBase64Chunks() {
        const path = this.isRetried ? this.data.sparePath : this.data.path
        let i = 0;
        await RNFetchBlob.fs.readStream(
            path,
            'base64',
            this.data.size
        )
            .then((ifstream) => {
                ifstream.open();

                ifstream.onData((chunk) => {
                    i++;
                    this.chunks.push(chunk);

                    if (i === 1)
                        this.next();
                });

                ifstream.onError(e => {
                    if (!this.isRetried) {
                        this.isRetried = true
                        this.getBase64Chunks()
                    } else {
                        this.onFetchBlobError()
                    }
                });

                ifstream.onEnd(() => {
                    //
                });
            });
    }

    async next(files) {
        if (files) {
            this.files = files
        }
        this.level++;

        if (this.level > 1) {
            await this.unlink(this.file.path);
        }

        this.store(this.level);
    }

    retry() {
        this.eject();
    }

    async store(index) {
        let chunk = null;

        while (true) {
            if (index <= this.chunks.length) {
                chunk = this.chunks[index - 1];

                break;
            }
        }
        
        const path = `${this.data.destinationPath}/chunk-${this.data.fileShortId}-${index}.tmp`;

        await RNFetchBlob.fs.writeFile(path, chunk, 'base64')
            .then(() => {
                this.file = {
                    number: index,
                    path,
                    headers: this.getHeaders(index),
                    blob: this.getBlobObject(path),
                    type: this.fileType
                };
            })
            .catch(e => {
                this.onWriteFileError(e);
            });
    
        this.eject();
    }

    eject() {
        this.event(this.file, this.next.bind(this), this.retry.bind(this), this.unlink.bind(this), this.files);
    }

    async unlink(path) {
        await RNFS.unlink(path)
            .then(() => {
                //
            })
            .catch((err) => {
                //
            });
    }

    getBlobObject(path) {
        return {
            name: 'blob',
            type: 'application/octet-stream',
            uri: 'file://' + path,
        }
    }

    getHeaders(index) {
        return {
            "resumableChunkNumber" : index,
            "resumableTotalChunks" : this.data.totalNumber,
            "resumableChunkSize" : this.data.size,
            "resumableFilename" : this.data.fileName,
            "resumableTotalSize" : this.data.fileSize,
            "resumableIdentifier" : this.data.fileIdentity,
            "resumableCurrentChunkSize": this.data.size,
            "resumableType": this.fileType,
        }
    }

    generateFileIdentity(length = 32) {
        return [...Array(length)].map(() => (~~(Math.random() * 36)).toString(36)).join('');
    }

    getTotalNumber() {
        const total = Math.ceil(this.data.fileSize / this.data.size);
        
        return total > 0 ? total : 1;
    }
}

ChunkUpload.defaultProps = {
    onFetchBlobError: () => {},
    onWriteFileError: () => {},
};

export default ChunkUpload;
