import {
  User, Users, ClipboardList, Zap, Database, Package,
  Folder, ShieldCheck, RefreshCw, Check, ChevronRight,
  ChevronDown, AlertTriangle, FolderKey, Lock, FolderOpen,
} from 'lucide-react'

const SM = { size: 14, strokeWidth: 1.8 }
const MD = { size: 16, strokeWidth: 1.8 }

export const IconUser      = (p) => <User          {...SM} {...p} />
export const IconUsers     = (p) => <Users         {...SM} {...p} />
export const IconTask      = (p) => <ClipboardList {...SM} {...p} />
export const IconOp        = (p) => <Zap           {...SM} {...p} />
export const IconStore     = (p) => <Database      {...SM} {...p} />
export const IconApp       = (p) => <Package       {...SM} {...p} />
export const IconFolder    = (p) => <Folder        {...SM} {...p} />
export const IconAuth      = (p) => <ShieldCheck   {...SM} {...p} />
export const IconFolderKey = (p) => <FolderKey     {...SM} {...p} />
export const IconRefresh   = (p) => <RefreshCw     {...SM} {...p} />
export const IconCheck     = (p) => <Check         {...SM} {...p} />
export const IconChevRight = (p) => <ChevronRight  {...SM} {...p} />
export const IconChevDown  = (p) => <ChevronDown   {...SM} {...p} />
export const IconWarn      = (p) => <AlertTriangle {...SM} {...p} />

export const IconUserMd    = (p) => <User          {...MD} {...p} />
export const IconUsersMd   = (p) => <Users         {...MD} {...p} />
export const IconTaskMd    = (p) => <ClipboardList {...MD} {...p} />
export const IconOpMd      = (p) => <Zap           {...MD} {...p} />
export const IconLock       = (p) => <Lock         {...MD} {...p} />
export const IconFolderOpen = (p) => <FolderOpen   {...MD} {...p} />
