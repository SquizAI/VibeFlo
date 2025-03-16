// This is a proper JSX button component with correct syntax
// Use this as a reference for fixing the Note.tsx file

<button
  key={category}
  className={`p-1 rounded text-xs flex items-center justify-between ${
    note.color === color ? 'bg-white/20' : 'hover:bg-white/10'
  }`}
  onClick={() => {
    updateNote(note.id, { color });
    setShowColorPicker(false);
  }}
>
  <span>{category}</span>
  <div className={`w-4 h-4 rounded ${
    color === 'red' ? 'bg-red-500' :
    color === 'green' ? 'bg-green-500' :
    color === 'blue' ? 'bg-blue-500' :
    color === 'yellow' ? 'bg-yellow-500' :
    color === 'purple' ? 'bg-purple-500' : 
    color === 'pink' ? 'bg-pink-500' : 
    color === 'sky' ? 'bg-sky-500' :
    color === 'lime' ? 'bg-lime-500' :
    color === 'fuchsia' ? 'bg-fuchsia-500' :
    color === 'cyan' ? 'bg-cyan-500' :
    color === 'slate' ? 'bg-slate-500' :
    color === 'gray' ? 'bg-gray-500' : 'bg-gray-500'
  }`}></div>
</button> 