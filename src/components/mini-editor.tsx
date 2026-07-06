'use client';

import { useState } from 'react';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ImageIcon,
  Indent,
  Outdent,
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface MiniEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function MiniEditor({ value, onChange, placeholder }: MiniEditorProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [imagePopoverOpen, setImagePopoverOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-2',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Add notes or details...',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none min-h-[100px] w-full bg-white px-3 py-2 text-sm',
          'focus-visible:outline-none'
        ),
      },
    },
  });

  const handleAddImage = () => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setImagePopoverOpen(false);
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="rounded-md border border-input bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-200 bg-slate-50">
        {/* Text Formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            'p-1.5 rounded hover:bg-slate-200 transition-colors',
            editor.isActive('bold') && 'bg-slate-200 text-indigo-600'
          )}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            'p-1.5 rounded hover:bg-slate-200 transition-colors',
            editor.isActive('italic') && 'bg-slate-200 text-indigo-600'
          )}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            'p-1.5 rounded hover:bg-slate-200 transition-colors',
            editor.isActive('underline') && 'bg-slate-200 text-indigo-600'
          )}
          title="Underline"
        >
          <span className="w-4 h-4 font-medium underline text-sm">U</span>
        </button>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        {/* Alignment */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={cn(
            'p-1.5 rounded hover:bg-slate-200 transition-colors',
            editor.isActive({ textAlign: 'left' }) && 'bg-slate-200 text-indigo-600'
          )}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={cn(
            'p-1.5 rounded hover:bg-slate-200 transition-colors',
            editor.isActive({ textAlign: 'center' }) && 'bg-slate-200 text-indigo-600'
          )}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={cn(
            'p-1.5 rounded hover:bg-slate-200 transition-colors',
            editor.isActive({ textAlign: 'right' }) && 'bg-slate-200 text-indigo-600'
          )}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={cn(
            'p-1.5 rounded hover:bg-slate-200 transition-colors',
            editor.isActive({ textAlign: 'justify' }) && 'bg-slate-200 text-indigo-600'
          )}
          title="Justify"
        >
          <AlignJustify className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            'p-1.5 rounded hover:bg-slate-200 transition-colors',
            editor.isActive('bulletList') && 'bg-slate-200 text-indigo-600'
          )}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            'p-1.5 rounded hover:bg-slate-200 transition-colors',
            editor.isActive('orderedList') && 'bg-slate-200 text-indigo-600'
          )}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        {/* Indentation */}
        <button
          type="button"
          onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
          disabled={!editor.can().sinkListItem('listItem')}
          className="p-1.5 rounded hover:bg-slate-200 transition-colors disabled:opacity-40"
          title="Increase Indent"
        >
          <Indent className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().liftListItem('listItem').run()}
          disabled={!editor.can().liftListItem('listItem')}
          className="p-1.5 rounded hover:bg-slate-200 transition-colors disabled:opacity-40"
          title="Decrease Indent"
        >
          <Outdent className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        {/* Image */}
        <Popover open={imagePopoverOpen} onOpenChange={setImagePopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="p-1.5 rounded hover:bg-slate-200 transition-colors"
              title="Add Image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3">
            <div className="space-y-2">
              <Label htmlFor="mini-image-url" className="text-xs">Image URL</Label>
              <Input
                id="mini-image-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddImage()}
              />
              <Button size="sm" className="w-full" onClick={handleAddImage}>
                Add Image
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        {/* Undo/Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded hover:bg-slate-200 transition-colors disabled:opacity-40"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded hover:bg-slate-200 transition-colors disabled:opacity-40"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>
      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
