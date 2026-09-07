type AvatarProps = {
  name: string;
  avatarKey?: string;
  size?: number;
};

export function Avatar({ name, avatarKey = "sky", size = 40 }: AvatarProps) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <span
      aria-label={name}
      className={`avatar avatar--${avatarKey}`}
      role="img"
      style={{ height: size, width: size }}
    >
      {initials}
    </span>
  );
}
