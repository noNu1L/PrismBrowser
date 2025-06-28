import { TabType } from '../constants/tab'

export interface TabEntity {
  id: string;           // uuid
  index: number;        // 顺序
  title: string;        // 网站标题
  url: string;          // 网页地址
  icon: string;         // 图标url或特殊值
  loading: boolean;     // 是否加载中
  active: boolean;      // 是否激活
  pinned: boolean;      // 是否固定
  groupId: string;      // 分组ID
  type: TabType;        // 标签类型
  muted: boolean;       // 是否静音
}

export interface TabState {
  tabs: TabEntity[];
  activeTabId: string;
  lastActiveTabId: string;
} 