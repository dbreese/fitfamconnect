<script setup lang="ts">
import { ref, defineProps, onMounted, onBeforeUnmount, watch } from 'vue';
import { copyToClipboard } from '@/shared/Utils';
import { Color } from '@tiptap/extension-color';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Constants from '@/shared/Constants';
import Image from '@tiptap/extension-image';

import { Editor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import ListItem from '@tiptap/extension-list-item';
import TextStyle from '@tiptap/extension-text-style';
import Document from '@tiptap/extension-document';
import Gapcursor from '@tiptap/extension-gapcursor';
import Paragraph from '@tiptap/extension-paragraph';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import Text from '@tiptap/extension-text';
import type { ColorPickerChangeEvent } from 'primevue/colorpicker';

const toast = useToast();
const { t } = useI18n();

const props = defineProps<{ content: string }>();
const emit = defineEmits(['update:content']);

const updateContent = (event: Event) => {
    const target = event.target as HTMLTextAreaElement;
    emit('update:content', target.value);
};

watch(
    () => props.content,
    (newContent) => {
        console.log('UPDATING AGAIN!');
        if (editor.value && newContent !== editor.value.getHTML()) {
            editor.value.commands.setContent(newContent, false); // Update content without modifying history
        }
    }
);

// build the editor
const editor = ref<Editor>();

onMounted(() => {
    editor.value = new Editor({
        content: props.content,
        extensions: [
            StarterKit,
            TextStyle,
            Color,
            Table.configure({
                resizable: true
            }),
            TableRow,
            TableHeader,
            TableCell,
            Image.configure({
                inline: true,
                allowBase64: true,
                HTMLAttributes: {
                    class: 'editor-image'
                }
            })
        ],
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none'
            }
        }
    });
});

onBeforeUnmount(() => {
    editor.value?.destroy();
});

function handleCopy() {
    const currentValue = editor.value?.getHTML();
    if (currentValue)
        copyToClipboard(currentValue).then((success) => {
            if (success) {
                toast.add({
                    severity: 'success',
                    summary: t('utils.clipboardSuccess'),
                    life: Constants.DEFAULT_TOAST_TIME
                });
            } else {
                console.log('An error occurred attempting to copy to clipboard.');
            }
        });
}

function focusOnEditor() {
    const editorContent = document.querySelector<HTMLDivElement>('.ProseMirror');
    editorContent?.focus();
}

// Add these new functions for image handling
function addImage() {
    const url = window.prompt('Enter the URL of the image:');
    if (url) {
        editor.value?.chain().focus().setImage({ src: url }).run();
    }
}

function handleImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result;
            if (typeof result === 'string') {
                editor.value?.chain().focus().setImage({ src: result }).run();
            }
        };
        reader.readAsDataURL(file);
    }
}

// Add this near your other refs
const colorPickerVisible = ref(false);

// Update the handleColorChange function
function handleColorChange(event: ColorPickerChangeEvent) {
    const color = event.value;
    try {
        // Ensure the color has a # prefix
        const colorValue = color.startsWith('#') ? color : `#${color}`;
        editor.value?.chain().focus().setColor(colorValue).run();
        // Close the color picker
        console.log('closing color picker');
        colorPickerVisible.value = false;
    } catch (error) {
        console.error('Error applying color:', error);
    }
}

// Color Picker
const selectedColor = ref<string | null>(null);
</script>

<template>
    <div class="pt-4 text-lg">
        <div class="flex flex-col">
            <!-- Toolbar -->
            <div v-if="editor" @click="focusOnEditor">
                <div class="control-group">
                    <div class="button-group">
                        <Button
                            icon="fa-solid fa-undo"
                            text
                            size="large"
                            v-tooltip.bottom="t('editor.undo')"
                            @click="editor.chain().focus().undo().run()"
                            :disabled="!editor.can().chain().focus().undo().run()"
                        />
                        <Button
                            icon="fa-solid fa-redo"
                            text
                            size="large"
                            v-tooltip.bottom="t('editor.redo')"
                            @click="editor.chain().focus().redo().run()"
                            :disabled="!editor.can().chain().focus().redo().run()"
                        />

                        <span class="separator"></span>

                        <Button
                            icon="fa-solid fa-bold"
                            text
                            size="large"
                            v-tooltip.bottom="t('editor.bold')"
                            @click="editor.chain().focus().toggleBold().run()"
                            :disabled="!editor.can().chain().focus().toggleBold().run()"
                            :class="{ 'is-active': editor.isActive('bold') }"
                        />

                        <Button
                            icon="fa-solid fa-italic"
                            text
                            size="large"
                            v-tooltip.bottom="t('editor.italic')"
                            @click="editor.chain().focus().toggleItalic().run()"
                            :disabled="!editor.can().chain().focus().toggleItalic().run()"
                            :class="{ 'is-active': editor.isActive('italic') }"
                        />

                        <Button
                            icon="fa-solid fa-strikethrough"
                            text
                            size="large"
                            v-tooltip.bottom="t('editor.strike')"
                            @click="editor.chain().focus().toggleStrike().run()"
                            :disabled="!editor.can().chain().focus().toggleStrike().run()"
                            :class="{ 'is-active': editor.isActive('strike') }"
                        />

                        <span class="separator"></span>

                        <Button
                            icon="fa-solid fa-paragraph"
                            text
                            size="large"
                            v-tooltip.bottom="t('editor.paragraph')"
                            @click="editor.chain().focus().setParagraph().run()"
                            :class="{ 'is-active': editor.isActive('paragraph') }"
                        />

                        <Button
                            label="H1"
                            text
                            size="large"
                            v-tooltip.bottom="t('editor.h1')"
                            @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
                            :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
                            class="editor-button-width"
                        />
                        <Button
                            label="H2"
                            text
                            size="large"
                            v-tooltip.bottom="t('editor.h2')"
                            @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
                            :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
                            class="editor-button-width"
                        />
                        <Button
                            label="H3"
                            text
                            size="large"
                            v-tooltip.bottom="t('editor.h3')"
                            @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
                            :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
                            class="editor-button-width"
                        />
                        <Button
                            label="H4"
                            text
                            size="large"
                            v-tooltip.bottom="t('editor.h4')"
                            @click="editor.chain().focus().toggleHeading({ level: 4 }).run()"
                            :class="{ 'is-active': editor.isActive('heading', { level: 4 }) }"
                            class="editor-button-width"
                        />

                        <Button
                            icon="fa-solid fa-list"
                            text
                            size="large"
                            v-tooltip.bottom="t('editor.bulletList')"
                            @click="editor.chain().focus().toggleBulletList().run()"
                            :class="{ 'is-active': editor.isActive('bulletList') }"
                            class="editor-button-width"
                        />

                        <Button
                            icon="fa-solid fa-list-ol"
                            text
                            size="large"
                            v-tooltip.bottom="t('editor.orderedList')"
                            @click="editor.chain().focus().toggleOrderedList().run()"
                            :class="{ 'is-active': editor.isActive('orderedList') }"
                            class="editor-button-width"
                        />

                        <span class="separator"></span>

                        <!-- Color Picker -->
                        <div class="color-picker-wrapper">
                            <Button
                                icon="fa-solid fa-palette"
                                text
                                size="large"
                                v-tooltip.bottom="t('editor.color')"
                                :class="{ 'is-active': editor.isActive('textStyle', { color: selectedColor }) }"
                            >
                                <ColorPicker
                                    v-model="selectedColor"
                                    @change="handleColorChange"
                                    :pt="{
                                        root: { class: 'editor-color-picker' }
                                    }"
                                    appendTo="body"
                                    v-model:visible="colorPickerVisible"
                                />
                            </Button>
                        </div>

                        <!-- Image buttons -->
                        <Button
                            icon="fa-solid fa-image"
                            text
                            size="large"
                            v-tooltip.bottom="t('editor.imageUrl')"
                            @click="addImage"
                        />
                        <label class="p-button p-button-text p-button-lg" style="margin: 0">
                            <input type="file" accept="image/*" class="hidden" @change="handleImageUpload" />
                            <i class="fa-solid fa-upload" v-tooltip.bottom="t('editor.uploadImage')"></i>
                        </label>

                        <span class="separator"></span>

                        <Button
                            icon="fa-solid fa-broom"
                            text
                            size="large"
                            v-tooltip.bottom="t('editor.clear')"
                            @click="
                                editor.chain().focus().clearNodes().run();
                                editor.chain().focus().unsetAllMarks().run();
                            "
                        />

                        <div class="push-right">
                            <Button
                                icon="fa-solid fa-copy"
                                text
                                size="large"
                                v-tooltip.bottom="t('editor.copy')"
                                @click="handleCopy"
                            />
                            <!-- <Button icon="fa-solid fa-save" text size="large" v-tooltip.bottom="t('editor.save')" @click="handleSave" /> -->
                        </div>
                    </div>
                </div>

                <EditorContent
                    id="editor"
                    v-if="editor"
                    :editor="editor"
                    class="tiptap border p-2 rounded-lg min-h-[150px] text-base h-full w-full resize-y overflow-auto"
                ></EditorContent>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.larger-text {
    font-size: 1.2rem; // This will make text 20% larger than your base font size

    // If you want specific elements to be different sizes:
    h1 {
        font-size: 2rem;
    }
    p {
        font-size: 1.2rem;
    }
    .small-text {
        font-size: 1rem;
    }
}

/* Basic editor styles */
.tiptap {
    :first-child {
        margin-top: 0;
    }

    /* List styles */
    ul,
    ol {
        padding: 0 1rem;
        margin: 1.25rem 1rem 1.25rem 0.4rem;

        li p {
            margin-top: 0.25em;
            margin-bottom: 0.25em;
        }
    }

    /* Heading styles */
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
        line-height: 1.1;
        margin-top: 2.5rem;
        text-wrap: pretty;
    }

    h1,
    h2 {
        margin-top: 3.5rem;
        margin-bottom: 1.5rem;
    }

    h1 {
        font-size: 1.4rem;
    }

    h2 {
        font-size: 1.2rem;
    }

    h3 {
        font-size: 1.1rem;
    }

    h4,
    h5,
    h6 {
        font-size: 1rem;
    }

    /* Code and preformatted text styles */
    code {
        background-color: var(--purple-light);
        border-radius: 0.4rem;
        color: var(--black);
        font-size: 0.85rem;
        padding: 0.25em 0.3em;
    }

    pre {
        background: var(--black);
        border-radius: 0.5rem;
        color: var(--white);
        font-family: 'JetBrainsMono', monospace;
        margin: 1.5rem 0;
        padding: 0.75rem 1rem;

        code {
            background: none;
            color: inherit;
            font-size: 0.8rem;
            padding: 0;
        }
    }

    blockquote {
        border-left: 3px solid var(--gray-3);
        margin: 1.5rem 0;
        padding-left: 1rem;
    }

    /* Table-specific styling */
    table {
        border-collapse: collapse;
        margin: 0;
        overflow: hidden;
        table-layout: fixed;
        width: 100%;

        td,
        th {
            border: 1px solid var(--p-primary-color);
            background-color: var(--p-surface-50);
            box-sizing: border-box;
            min-width: 1em;
            padding: 6px 8px;
            position: relative;
            vertical-align: top;

            > * {
                margin-bottom: 0;
            }
        }

        th {
            background-color: var(--p-surface-200);
            font-weight: bold;
            text-align: left;
        }

        .selectedCell:after {
            background: var(--p-surface-100);
            content: '';
            left: 0;
            right: 0;
            top: 0;
            bottom: 0;
            pointer-events: none;
            position: absolute;
            z-index: 2;
        }

        .column-resize-handle {
            background-color: var(--p-primary-color);
            bottom: -2px;
            pointer-events: none;
            position: absolute;
            right: -2px;
            top: 0;
            width: 4px;
        }
    }

    .tableWrapper {
        margin: 1.5rem 0;
        overflow-x: auto;
    }

    &.resize-cursor {
        cursor: ew-resize;
        cursor: col-resize;
    }

    /* Image styles */
    .editor-image {
        max-width: 100%;
        height: auto;
        margin: 1rem 0;
        display: block;

        &.ProseMirror-selectednode {
            outline: 2px solid var(--p-primary-color);
        }
    }

    /* Hide file input */
    .hidden {
        display: none;
    }
}

/* Transition styles */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* Add these styles to your existing styles */
.color-picker-wrapper {
    display: inline-flex;
    align-items: center;

    .p-colorpicker-overlay {
        z-index: 1000;
    }

    .editor-color-picker {
        .p-colorpicker-preview {
            width: 1.25rem;
            height: 1.25rem;
        }
    }
}
</style>
