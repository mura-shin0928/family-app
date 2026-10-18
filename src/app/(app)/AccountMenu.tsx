"use client";

import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import MailOutlinedIcon from "@mui/icons-material/MailOutlined";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useRouter } from "next/navigation";
import { type MouseEvent, useState, useTransition } from "react";
import { CONTACT_SUBJECT, contactMailto } from "@/lib/contact";

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
  const mailto = contactMailto(CONTACT_SUBJECT);

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

  function handleReleaseNotes() {
    handleClose();
    router.push("/release-notes");
  }

  function handleNavigate(href: string) {
    handleClose();
    router.push(href);
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
        <MenuItem onClick={handleReleaseNotes}>
          <ListItemIcon>
            <HistoryOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>更新内容</ListItemText>
        </MenuItem>
        {mailto && (
          <MenuItem component="a" href={mailto} onClick={handleClose}>
            <ListItemIcon>
              <MailOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>お問い合わせ</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => handleNavigate("/terms")}>
          <ListItemIcon>
            <DescriptionOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>利用規約</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleNavigate("/privacy")}>
          <ListItemIcon>
            <DescriptionOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>プライバシーポリシー</ListItemText>
        </MenuItem>
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
