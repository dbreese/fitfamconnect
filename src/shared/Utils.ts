export async function copyToClipboard(html: string): Promise<boolean> {
    if (!navigator.clipboard || !window.ClipboardItem) {
        console.error('Clipboard API not supported');
        return false;
    }

    const plainText = html.replace(/<[^>]+>/g, '');

    try {
        const clipboardItem = new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([plainText], { type: 'text/plain' })
        });

        await navigator.clipboard.write([clipboardItem]);
        return true;
    } catch (error) {
        console.error('Failed to copy:', error);
        return false;
    }
}
