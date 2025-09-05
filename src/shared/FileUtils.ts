import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';
GlobalWorkerOptions.workerSrc = pdfWorker;

async function extractTextFromPdf(base64String: string): Promise<string> {
    const base64Data = base64String.split(',')[1];
    const binaryData = atob(base64Data);

    // Convert binary data to Uint8Array
    const byteArray = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
        byteArray[i] = binaryData.charCodeAt(i);
    }

    const pdf = await getDocument({ data: byteArray }).promise;
    let text = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // item.hasEOL indicates a return.
        text += content.items.map((item: any) => (item.hasEOL ? item.str + '\n' : item.str)).join(' ');
    }

    return text.trim();
}

async function extractTextFromTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

export async function extractTextFromFile(file: File): Promise<string | undefined> {
    const fileType = file.type;
    console.log(`Reading file type ${fileType}---`);
    if (fileType === 'application/pdf') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                if (!e.target?.result) return reject('Error reading PDF');
                const extractedText = await extractTextFromPdf(e.target.result as string);
                resolve(extractedText);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    } else if (fileType.startsWith('text/')) {
        return extractTextFromTextFile(file);
    } else {
        console.warn('Unsupported file type:', fileType);
        return Promise.reject(`Unsupported file type ${fileType}`);
    }
}
