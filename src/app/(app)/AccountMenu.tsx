"use client";

import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useRouter } from "next/navigation";
import { type MouseEvent, useState, useTransition } from "react";

type Props = {
  displayName: string;
  isAppAdmin: boolean;
  /** Server Action。関数参照だが "use server" 付きのためClient Componentへpropとして渡してよい。 */
  signOut: () => Promise<void>;
};

export function AccountMenu({ displayName, isAppAdmin, signOut }: Props) {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const open = Boolean(anchorEl);

  function handleOpen(event: MouseEvent<HTMLElement>) {
    setAnchorEl(event.currentTarget);
  }

  function handleClose() {
    setAnchorEl(null);
  }

  function handleFamily() {
    handleClose();
    router.push("/family");
  }

  function handleAdmin() {
    handleClose();
    router.push("/admin");
  }

  function handleSignOut() {
    handleClose();
    startTransition(() => {
      signOut();
    });
  }

  return (
    <>
      <IconButton
        size="medium"
        aria-label={`${displayName}のメニュー`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={handleOpen}
      >
        <GroupOutlinedIcon fontSize="medium" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem disabled sx={{ opacity: "1 !important" }}>
          <ListItemText primary={displayName} />
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleFamily}>
          <ListItemIcon>
            <GroupOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>家族</ListItemText>
        </MenuItem>
        {isAppAdmin && (
          <MenuItem onClick={handleAdmin}>
            <ListItemIcon>
              <AdminPanelSettingsOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Admin</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={handleSignOut} disabled={isPending}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>ログアウト</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
