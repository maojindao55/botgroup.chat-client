import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  X, 
  Users, 
  MessageSquare, 
  Settings,
  Plus,
  Edit2,
  UserPlus,
  MoreVertical,
  Crown,
  Shield,
  User,
  Trash2,
  Mic,
  MicOff
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { GroupService, CreateGroupRequest, UpdateGroupRequest } from '@/services/groupService';
import { toast } from 'sonner';

interface GroupMember {
  id: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
  isMuted?: boolean;
  joinTime?: string;
}

interface GroupInfo {
  id?: string;
  name: string;
  description?: string;
  memberCount?: number;
  isPrivate?: boolean;
  members?: GroupMember[];
}

interface GroupSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  groupInfo?: GroupInfo;
  onSave: (groupInfo: GroupInfo) => void;
  onCancel?: () => void;
  onMemberAction?: (action: 'add' | 'remove' | 'mute' | 'unmute' | 'role', memberId: string, data?: any) => void;
  onDeleteGroup?: (groupId: string) => void;
  currentUserId?: string;
}

export const GroupSettings = ({
  isOpen,
  onClose,
  mode,
  groupInfo,
  onSave,
  onCancel,
  onMemberAction,
  onDeleteGroup,
  currentUserId
}: GroupSettingsProps) => {
  const [formData, setFormData] = useState<GroupInfo>({
    name: '',
    description: '',
    isPrivate: false,
    members: []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'members'>('info');
  const [showAddMember, setShowAddMember] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (mode === 'edit' && groupInfo) {
      setFormData({
        name: groupInfo.name || '',
        description: groupInfo.description || '',
        isPrivate: groupInfo.isPrivate || false,
        members: groupInfo.members || []
      });
    } else {
      setFormData({
        name: '',
        description: '',
        isPrivate: false,
        members: []
      });
    }
    setErrors({});
    setActiveTab('info');
  }, [mode, groupInfo, isOpen]);

  // 表单验证
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '群名称不能为空';
    } else if (formData.name.length > 20) {
      newErrors.name = '群名称不能超过20个字符';
    }
    
    if (formData.description && formData.description.length > 100) {
      newErrors.description = '群描述不能超过100个字符';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理保存
  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      if (mode === 'create') {
        // 创建新群组
        const createRequest: CreateGroupRequest = {
          name: formData.name,
          description: formData.description
        };
        
        const response = await GroupService.createGroup(createRequest);
        if (response.success) {
          toast.success(response.message || '创建群聊成功');
          onSave({
            ...formData,
            id: response.data.id.toString(),
            memberCount: 1
          });
          onClose();
        }
      } else {
        // 更新现有群组
        if (!groupInfo?.id) {
          toast.error('群组ID不存在');
          return;
        }
        
        const updateRequest: UpdateGroupRequest = {
          name: formData.name,
          description: formData.description
        };
        
        const response = await GroupService.updateGroup(Number(groupInfo.id), updateRequest);
        if (response.success) {
          toast.success(response.message || '更新群聊成功');
          onSave({
            ...formData,
            id: groupInfo.id
          });
          onClose();
        }
      }
    } catch (error: any) {
      console.error('保存失败:', error);
      toast.error(error.message || '操作失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理取消
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  // 处理输入变化
  const handleInputChange = (field: keyof GroupInfo, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // 生成头像背景色（用于成员头像）
  const getAvatarData = (name: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return {
      backgroundColor: colors[index],
      text: name[0]?.toUpperCase() || 'U'
    };
  };

  // 获取角色图标
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  // 获取角色标签颜色
  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // 处理群员操作
  const handleMemberAction = (action: 'add' | 'remove' | 'mute' | 'unmute' | 'role', memberId: string, data?: any) => {
    onMemberAction?.(action, memberId, data);
  };

  // 处理删除群组
  const handleDeleteGroup = async () => {
    if (!groupInfo?.id) {
      toast.error('群组ID不存在');
      return;
    }

    if (!confirm('确定要删除这个群聊吗？删除后将无法恢复。')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await GroupService.deleteGroup(Number(groupInfo.id));
      if (response.success) {
        toast.success(response.message || '删除群聊成功');
        onDeleteGroup?.(groupInfo.id);
        onClose();
      }
    } catch (error: any) {
      console.error('删除失败:', error);
      toast.error(error.message || '删除失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const isEditMode = mode === 'edit';
  const title = isEditMode ? '编辑群聊' : '新建群聊';

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] sm:w-[500px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {isEditMode ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {title}
          </SheetTitle>
        </SheetHeader>
        
        {/* 标签页切换 */}
        {isEditMode && (
          <div className="flex space-x-1 mt-4">
            <Button
              variant={activeTab === 'info' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('info')}
              className="flex-1"
            >
              <Settings className="w-4 h-4 mr-2" />
              群信息
            </Button>
            <Button
              variant={activeTab === 'members' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('members')}
              className="flex-1"
            >
              <Users className="w-4 h-4 mr-2" />
              群成员
            </Button>
          </div>
        )}
        
        <div className="mt-6 space-y-6">
          {/* 群信息标签页 */}
          {(!isEditMode || activeTab === 'info') && (
            <>

              {/* 群名称 */}
              <div className="space-y-2">
                <Label htmlFor="groupName" className="text-sm font-medium">
                  群名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="groupName"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="请输入群名称"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
                <p className="text-xs text-gray-500">
                  {formData.name.length}/20 字符
                </p>
              </div>

              {/* 群描述 */}
              <div className="space-y-2">
                <Label htmlFor="groupDescription" className="text-sm font-medium">
                  群描述
                </Label>
                <Textarea
                  id="groupDescription"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="请输入群描述（可选）"
                  className={`resize-none ${errors.description ? 'border-red-500' : ''}`}
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">{errors.description}</p>
                )}
                <p className="text-xs text-gray-500">
                  {formData.description?.length || 0}/100 字符
                </p>
              </div>

              {/* 群信息统计（仅编辑模式显示） */}
              {isEditMode && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>成员数量</span>
                    </div>
                    <p className="text-lg font-semibold mt-1">
                      {groupInfo?.memberCount || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MessageSquare className="w-4 h-4" />
                      <span>群类型</span>
                    </div>
                    <p className="text-lg font-semibold mt-1">
                      {formData.isPrivate ? '私密群' : '公开群'}
                    </p>
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    <X className="w-4 h-4 mr-2" />
                    取消
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="flex-1"
                    disabled={isLoading || !formData.name.trim()}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isLoading ? '保存中...' : (isEditMode ? '保存更改' : '创建群聊')}
                  </Button>
                </div>
                
                {/* 删除群组按钮（仅编辑模式显示） */}
                {isEditMode && (
                  <Button
                    variant="destructive"
                    onClick={handleDeleteGroup}
                    className="w-full"
                    disabled={isLoading}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除群聊
                  </Button>
                )}
              </div>
            </>
          )}

          {/* 群成员标签页 */}
          {isEditMode && activeTab === 'members' && (
            <div className="space-y-4">
              {/* 成员列表头部 */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">群成员 ({formData.members?.length || 0})</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowAddMember(true)}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  添加成员
                </Button>
              </div>

              {/* 成员列表 */}
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {formData.members?.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          {member.avatar ? (
                            <AvatarImage src={member.avatar} />
                          ) : (
                            <AvatarFallback
                              style={{
                                backgroundColor: getAvatarData(member.name).backgroundColor,
                                color: 'white'
                              }}
                            >
                              {getAvatarData(member.name).text}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{member.name}</span>
                            {member.id === currentUserId && (
                              <Badge variant="outline" className="text-xs">我</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {getRoleIcon(member.role)}
                            <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
                              {member.role === 'owner' ? '群主' : member.role === 'admin' ? '管理员' : '成员'}
                            </Badge>
                            {member.isMuted && (
                              <Badge variant="destructive" className="text-xs">已禁言</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 成员操作按钮 */}
                      {member.id !== currentUserId && (
                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleMemberAction(
                                    member.isMuted ? 'unmute' : 'mute',
                                    member.id
                                  )}
                                >
                                  {member.isMuted ? (
                                    <Mic className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <MicOff className="w-4 h-4 text-red-500" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {member.isMuted ? '取消禁言' : '禁言'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {member.role !== 'owner' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleMemberAction('remove', member.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>移除成员</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>更多操作</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                  ))}

                  {(!formData.members || formData.members.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>暂无群成员</p>
                      <p className="text-sm">点击"添加成员"邀请用户加入群聊</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* 添加成员对话框占位 */}
              {showAddMember && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">添加群成员</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowAddMember(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <Input placeholder="搜索用户名或输入用户ID" />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowAddMember(false)}>
                          取消
                        </Button>
                        <Button onClick={() => setShowAddMember(false)}>
                          添加
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
