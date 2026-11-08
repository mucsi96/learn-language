import { Button, Menu, MenuItem, MenuPopover, MenuTrigger } from '@mucsi96/react-ui';
import { useQuery } from '@tanstack/react-query';
import { apiQuery } from '../api/http';
import { userSchema } from '../api/schemas';

export function ProfileMenu({ onResetPomodoro, resetDisabled }: {
  onResetPomodoro?: () => void;
  resetDisabled?: boolean;
}) {
  const profile = useQuery(apiQuery('/oauth2/userinfo', userSchema));
  const name = profile.data &&
    (profile.data.additionalClaims?.name ?? profile.data.preferredUsername ?? profile.data.email).trim();
  return (
    <MenuTrigger>
      <Button variant="avatar" aria-label="Profile menu">
        {name?.split(/\s+/).map((part) => part[0]).join('').toUpperCase()}
      </Button>
      <MenuPopover>
        <Menu aria-label="Profile menu">
          {name && <MenuItem isDisabled>{name}</MenuItem>}
          {onResetPomodoro && (
            <MenuItem onAction={onResetPomodoro} isDisabled={resetDisabled}>Reset Pomodoro</MenuItem>
          )}
          <MenuItem href="/sources">Sources</MenuItem>
          <MenuItem href="/in-review-cards">Review cards</MenuItem>
          <MenuItem href="/settings">Settings</MenuItem>
          <MenuItem href="/model-usage">Model usage</MenuItem>
        </Menu>
      </MenuPopover>
    </MenuTrigger>
  );
}
