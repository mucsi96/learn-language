const paths = {
  more: 'M12 5h.01M12 12h.01M12 19h.01',
  previous: 'm15 18-6-6 6-6',
  next: 'm9 18 6-6-6-6',
  cards: 'M8 3h12v14H8zM4 7v14h12',
  upload: 'M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5',
};

export function Icon({ name }: { name: keyof typeof paths }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'more' ? 3 : 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
