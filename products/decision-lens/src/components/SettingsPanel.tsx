/**
 * SettingsPanel - DEPRECATED
 * API 配置已移至 src/config.ts，此组件不再使用。
 * 保留文件以避免导入错误。
 */
export default function SettingsPanel({ open, onClose: _onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return null;
}
