"use client";

type Props = {
  title: string;
  onClick: () => void;
};

export function Button({ title, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition"
    >
      {title}
    </button>
  );
}
