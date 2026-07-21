'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  ListChecks,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  ImageIcon,
  Undo,
  Redo,
  Palette,
  Highlighter,
  Minus,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/motion/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/motion/select';
import { Input } from '@/components/motion/input';
import { Label } from '@/components/ui/label';
import { useState, useCallback } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const TEXT_COLORS = [
  { name: 'Default', color: null },
  { name: 'Black', color: '#000000' },
  { name: 'Gray', color: '#6b7280' },
  { name: 'Red', color: '#ef4444' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Yellow', color: '#eab308' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Cyan', color: '#06b6d4' },
];

const HIGHLIGHT_COLORS = [
  { name: 'None', color: null },
  { name: 'Yellow', color: '#fef08a' },
  { name: 'Green', color: '#bbf7d0' },
  { name: 'Blue', color: '#bfdbfe' },
  { name: 'Light Blue', color: '#a5f3fc' },
  { name: 'Indigo', color: '#c7d2fe' },
  { name: 'Orange', color: '#fed7aa' },
];

const FONT_SIZES = [
  { name: 'Small', size: '14px' },
  { name: 'Normal', size: '16px' },
  { name: 'Large', size: '18px' },
  { name: 'Extra Large', size: '24px' },
];

const ColorPicker = ({ editor, type }: { editor: any; type: 'text' | 'highlight' }) => {
  const colors = type === 'text' ? TEXT_COLORS : HIGHLIGHT_COLORS;
  const currentColor = type === 'text'
    ? editor.getAttributes('textStyle').color
    : editor.getAttributes('highlight').color;

  const handleColorChange = (color: string | null) => {
    if (type === 'text') {
      if (color) {
        editor.chain().focus().setColor(color).run();
      } else {
        editor.chain().focus().unsetColor().run();
      }
    } else {
      if (color) {
        editor.chain().focus().toggleHighlight({ color }).run();
      } else {
        editor.chain().focus().unsetHighlight().run();
      }
    }
  };

  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          {type === 'text' ? (
            <div className="flex flex-col items-center">
              <Palette className="h-4 w-4" />
              <div
                className="h-0.5 w-4 mt-0.5 rounded"
                style={{ backgroundColor: currentColor || '#000' }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Highlighter className="h-4 w-4" />
              <div
                className="h-0.5 w-4 mt-0.5 rounded"
                style={{ backgroundColor: currentColor || '#fef08a' }}
              />
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="grid grid-cols-5 gap-1">
          {colors.map((c) => (
            <button
              key={c.name}
              onClick={() => handleColorChange(c.color)}
              className={cn(
                'w-6 h-6 rounded border border-slate-200 dark:border-slate-600 hover:scale-110 transition-transform',
                currentColor === c.color && 'ring-2 ring-indigo-500 ring-offset-1'
              )}
              style={{ backgroundColor: c.color || (type === 'text' ? '#000' : '#fff') }}
              title={c.name}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const LinkPopover = ({ editor }: { editor: any }) => {
  const [url, setUrl] = useState('');
  const [open, setOpen] = useState(false);

  const handleSetLink = () => {
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    setOpen(false);
    setUrl('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      const previousUrl = editor.getAttributes('link').href || '';
      setUrl(previousUrl);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger>
        <Toggle size="sm" pressed={editor.isActive('link')}>
          <LinkIcon className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <Label htmlFor="link-url">URL</Label>
          <Input
            id="link-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            onKeyDown={(e) => e.key === 'Enter' && handleSetLink()}
          />
          <div className="flex justify-end gap-2">
            {editor.isActive('link') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setOpen(false);
                }}
              >
                Remove
              </Button>
            )}
            <Button size="sm" onClick={handleSetLink}>
              {editor.isActive('link') ? 'Update' : 'Add'} Link
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const ImagePopover = ({ editor }: { editor: any }) => {
  const [url, setUrl] = useState('');
  const [open, setOpen] = useState(false);

  const handleAddImage = () => {
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
    setOpen(false);
    setUrl('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <ImageIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <Label htmlFor="image-url">Image URL</Label>
          <Input
            id="image-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            onKeyDown={(e) => e.key === 'Enter' && handleAddImage()}
          />
          <Button size="sm" className="w-full" onClick={handleAddImage}>
            Add Image
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const Toolbar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  return (
    <div className="border border-input bg-white dark:bg-slate-800 rounded-t-md p-1.5 flex flex-wrap items-center gap-0.5 sticky top-0 z-10">
      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 dark:border-slate-700 mr-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Headings */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 dark:border-slate-700 mr-2">
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 1 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 3 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </Toggle>
      </div>

      {/* Text Formatting */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 dark:border-slate-700 mr-2">
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('underline')}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('strike')}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>
      </div>

      {/* Colors */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 dark:border-slate-700 mr-2">
        <ColorPicker editor={editor} type="text" />
        <ColorPicker editor={editor} type="highlight" />
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 dark:border-slate-700 mr-2">
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'left' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'center' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'right' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'justify' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('justify').run()}
        >
          <AlignJustify className="h-4 w-4" />
        </Toggle>
      </div>

      {/* Lists */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 dark:border-slate-700 mr-2">
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('taskList')}
          onPressedChange={() => editor.chain().focus().toggleTaskList().run()}
        >
          <ListChecks className="h-4 w-4" />
        </Toggle>
      </div>

      {/* Block Elements */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 dark:border-slate-700 mr-2">
        <Toggle
          size="sm"
          pressed={editor.isActive('blockquote')}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('codeBlock')}
          onPressedChange={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code className="h-4 w-4" />
        </Toggle>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </Button>
      </div>

      {/* Link & Image */}
      <div className="flex items-center gap-0.5">
        <LinkPopover editor={editor} />
        <ImagePopover editor={editor} />
      </div>
    </div>
  );
};

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
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
      Placeholder.configure({
        placeholder: 'Start writing your trip notes, packing lists, or plans here...',
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-600 underline hover:text-indigo-800',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose dark:prose-invert prose-sm sm:prose-base max-w-none',
          'min-h-[400px] w-full rounded-b-md border border-t-0 border-input bg-white dark:bg-slate-800 px-4 py-3 text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          '[&_ul[data-type="taskList"]]:list-none [&_ul[data-type="taskList"]]:pl-0',
          '[&_ul[data-type="taskList"]_li]:flex [&_ul[data-type="taskList"]_li]:items-start [&_ul[data-type="taskList"]_li]:gap-2',
          '[&_ul[data-type="taskList"]_li>label]:mt-0.5',
          '[&_ul[data-type="taskList"]_li>div]:flex-1'
        ),
      },
    },
  });

  return (
    <div className="flex flex-col h-full">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  );
}
