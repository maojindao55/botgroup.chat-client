import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Edit, Edit2, Check, X, Trash2 } from 'lucide-react';
import { type AICharacter } from "@/config/aiCharacters";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useState } from 'react';
import { toast } from 'sonner';
import { CharacterService, type Character } from '@/services/groupService';

interface User {
  id: number | string;
  name: string;
  avatar?: string;
}

interface MembersManagementProps {
  showMembers: boolean;
  setShowMembers: (show: boolean) => void;
  users: (User | AICharacter)[];
  getAvatarData: (name: string) => { backgroundColor: string; text: string };
  isGroupDiscussionMode: boolean;
  onToggleGroupDiscussion: () => void;
  groupName: string;
  onGroupNameChange: (newName: string) => void;
  groupId?: number;
  onMemberAdded?: (member: Character) => void;
  onMemberUpdated?: (member: Character) => void;
  onMemberDeleted?: (memberId: string) => void;
}

export const MembersManagement = ({
  showMembers,
  setShowMembers,
  users,
  getAvatarData,
  isGroupDiscussionMode,
  onToggleGroupDiscussion,
  groupName,
  onGroupNameChange,
  groupId,
  onMemberAdded,
  onMemberUpdated,
  onMemberDeleted
}: MembersManagementProps) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(groupName);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isEditMemberOpen, setIsEditMemberOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<(User | AICharacter) | null>(null);
  const [newMember, setNewMember] = useState({
    name: '',
    personality: '',
    model: '',
    avatar: '',
    custom_prompt: ''
  });
  const [editingMember, setEditingMember] = useState<(User | AICharacter) | null>(null);
  const [editedMemberData, setEditedMemberData] = useState({
    name: '',
    personality: '',
    model: '',
    avatar: '',
    custom_prompt: ''
  });

  const handleOpenAddMember = () => {
    if (!groupId) {
      toast.error('当前未选择群组，无法添加成员');
      return;
    }
    setIsAddMemberOpen(true);
  };

  const handleCloseAddMember = () => {
    setIsAddMemberOpen(false);
    setNewMember({
      name: '',
      personality: '',
      model: '',
      avatar: '',
      custom_prompt: ''
    });
  };

  const handleMemberFieldChange = (field: keyof typeof newMember, value: string) => {
    setNewMember(prev => ({ ...prev, [field]: value }));
  };

  const handleEditedMemberFieldChange = (field: keyof typeof editedMemberData, value: string) => {
    setEditedMemberData(prev => ({ ...prev, [field]: value }));
  };

  const handleOpenEditMember = (member: User | AICharacter) => {
    if (!groupId) {
      toast.error('当前未选择群组，无法编辑成员');
      return;
    }
    
    // 只允许编辑AI角色，不允许编辑当前用户
    if (member.name === "我" || member.id === 1) {
      toast.error('无法编辑当前用户');
      return;
    }

    setEditingMember(member);
    setEditedMemberData({
      name: member.name,
      personality: 'personality' in member ? member.personality || '' : '',
      model: 'model' in member ? member.model || '' : '',
      avatar: member.avatar || '',
      custom_prompt: 'custom_prompt' in member ? member.custom_prompt || '' : ''
    });
    setIsEditMemberOpen(true);
  };

  const handleCloseEditMember = () => {
    setIsEditMemberOpen(false);
    setEditingMember(null);
    setEditedMemberData({
      name: '',
      personality: '',
      model: '',
      avatar: '',
      custom_prompt: ''
    });
  };

  const handleOpenDeleteConfirm = (member: User | AICharacter) => {
    if (!groupId) {
      toast.error('当前未选择群组，无法删除成员');
      return;
    }
    
    // 只允许删除AI角色，不允许删除当前用户
    if (member.name === "我" || member.id === 1) {
      toast.error('无法删除当前用户');
      return;
    }

    setMemberToDelete(member);
    setIsDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setIsDeleteConfirmOpen(false);
    setMemberToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!groupId || !memberToDelete) {
      toast.error('参数错误，无法删除成员');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await CharacterService.deleteCharacter(Number(memberToDelete.id));

      if (response.success) {
        toast.success(response.message || '删除成员成功');
        onMemberDeleted?.(memberToDelete.id.toString());
        handleCloseDeleteConfirm();
      } else {
        toast.error(response.message || '删除成员失败');
      }
    } catch (error: any) {
      console.error('删除成员失败:', error);
      toast.error(error?.message || '删除成员失败，请稍后再试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitNewMember = async () => {
    if (!groupId) {
      toast.error('当前未选择群组，无法添加成员');
      return;
    }

    if (!newMember.name.trim()) {
      toast.error('请填写成员名称');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await CharacterService.createCharacter({
        gid: groupId,
        name: newMember.name.trim(),
        personality: newMember.personality.trim() || undefined,
        model: newMember.model.trim() || undefined,
        avatar: newMember.avatar.trim() || undefined,
        custom_prompt: newMember.custom_prompt.trim() || undefined
      });

      if (response.success && response.data) {
        toast.success(response.message || '添加成员成功');
        const newCharacter = response.data;
        onMemberAdded?.(newCharacter);
        handleCloseAddMember();
      } else {
        toast.error(response.message || '添加成员失败');
      }
    } catch (error: any) {
      console.error('添加成员失败:', error);
      toast.error(error?.message || '添加成员失败，请稍后再试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEditMember = async () => {
    if (!groupId || !editingMember) {
      toast.error('参数错误，无法编辑成员');
      return;
    }

    if (!editedMemberData.name.trim()) {
      toast.error('请填写成员名称');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await CharacterService.updateCharacter(Number(editingMember.id), {
        name: editedMemberData.name.trim(),
        personality: editedMemberData.personality.trim() || undefined,
        model: editedMemberData.model.trim() || undefined,
        avatar: editedMemberData.avatar.trim() || undefined,
        custom_prompt: editedMemberData.custom_prompt.trim() || undefined
      });

      if (response.success && response.data) {
        toast.success(response.message || '编辑成员成功');
        const updatedCharacter = response.data;
        onMemberUpdated?.(updatedCharacter);
        handleCloseEditMember();
      } else {
        toast.error(response.message || '编辑成员失败');
      }
    } catch (error: any) {
      console.error('编辑成员失败:', error);
      toast.error(error?.message || '编辑成员失败，请稍后再试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== groupName) {
      onGroupNameChange(editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setEditedName(groupName);
    setIsEditingName(false);
  };

  return (
    <Sheet open={showMembers} onOpenChange={setShowMembers}>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>群聊配置</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm">全员讨论模式</div>
                <div className="text-xs text-gray-500">开启后全员回复讨论</div>
              </div>
              <Switch
                checked={isGroupDiscussionMode}
                onCheckedChange={onToggleGroupDiscussion}
              />
            </div>
          </div>
          {/* 群名称编辑区域 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-2">
                <div className="text-sm text-gray-500 mb-1">群名称</div>
                {isEditingName ? (
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-sm"
                    placeholder="请输入群名称"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveName();
                      } else if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                  />
                ) : (
                  <div className="text-sm font-medium">{groupName}</div>
                )}
              </div>
              <div className="flex gap-1">
                {isEditingName ? (
                  <>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleSaveName}
                          >
                            <Check className="w-4 h-4 text-green-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>保存</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleCancelEdit}
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>取消</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setIsEditingName(true)}
                        >
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>编辑群名称</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500">当前成员（{users.length}）</span>
            <Button variant="ghost" size="sm" onClick={handleOpenAddMember}>
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-150px)]">
            <div className="space-y-2 pr-0">
              {users.map((user) => (
                <div key={user.id} className="group flex items-center justify-between p-2 hover:bg-gray-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      {'avatar' in user && user.avatar ? (
                        <AvatarImage src={user.avatar} className="w-10 h-10" />
                      ) : (
                        <AvatarFallback style={{ backgroundColor: getAvatarData(user.name).backgroundColor, color: 'white' }}>
                          {user.name[0]}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex flex-col">
                      <span>{user.name}</span>
                      {'personality' in user && user.personality && (
                        <span className="text-xs text-gray-500">{user.personality}</span>
                      )}
                    </div>
                  </div>
                   {user.id !==0 && (
                     <div className="flex opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                       <TooltipProvider>
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <Button
                               variant="ghost"
                               size="icon"
                               className="h-8 w-8 p-0"
                               onClick={() => handleOpenEditMember(user)}
                             >
                               <Edit className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                             </Button>
                           </TooltipTrigger>
                           <TooltipContent>
                             编辑角色
                           </TooltipContent>
                         </Tooltip>
                       </TooltipProvider>
                       <TooltipProvider>
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <Button
                               variant="ghost"
                               size="icon"
                               className="h-8 w-8 p-0"
                               onClick={() => handleOpenDeleteConfirm(user)}
                             >
                               <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                             </Button>
                           </TooltipTrigger>
                           <TooltipContent>
                             删除角色
                           </TooltipContent>
                         </Tooltip>
                       </TooltipProvider>
                     </div>
                   )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
      {/* 添加成员弹窗 */}
      <Dialog open={isAddMemberOpen} onOpenChange={(open) => (open ? handleOpenAddMember() : handleCloseAddMember())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加角色成员</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">名称</div>
              <Input
                value={newMember.name}
                onChange={(e) => handleMemberFieldChange('name', e.target.value)}
                placeholder="请输入角色名称"
              />
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">人设</div>
              <Input
                value={newMember.personality}
                onChange={(e) => handleMemberFieldChange('personality', e.target.value)}
                placeholder="例如：温柔的情感助理"
              />
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">模型</div>
              <Input
                value={newMember.model}
                onChange={(e) => handleMemberFieldChange('model', e.target.value)}
                placeholder="请输入使用的模型，如 deepseek-chat"
              />
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">头像地址</div>
              <Input
                value={newMember.avatar}
                onChange={(e) => handleMemberFieldChange('avatar', e.target.value)}
                placeholder="可选，输入头像图片URL"
              />
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">自定义提示词</div>
              <Textarea
                value={newMember.custom_prompt}
                onChange={(e) => handleMemberFieldChange('custom_prompt', e.target.value)}
                placeholder="可选，为角色设置自定义提示词"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseAddMember} disabled={isSubmitting}>
              取消
            </Button>
            <Button onClick={handleSubmitNewMember} disabled={isSubmitting}>
              {isSubmitting ? '添加中...' : '确认添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑成员弹窗 */}
      <Dialog open={isEditMemberOpen} onOpenChange={(open) => (open ? setIsEditMemberOpen(true) : handleCloseEditMember())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑角色成员</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">名称</div>
              <Input
                value={editedMemberData.name}
                onChange={(e) => handleEditedMemberFieldChange('name', e.target.value)}
                placeholder="请输入角色名称"
              />
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">人设</div>
              <Input
                value={editedMemberData.personality}
                onChange={(e) => handleEditedMemberFieldChange('personality', e.target.value)}
                placeholder="例如：温柔的情感助理"
              />
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">模型</div>
              <Input
                value={editedMemberData.model}
                onChange={(e) => handleEditedMemberFieldChange('model', e.target.value)}
                placeholder="请输入使用的模型，如 deepseek-chat"
              />
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">头像地址</div>
              <Input
                value={editedMemberData.avatar}
                onChange={(e) => handleEditedMemberFieldChange('avatar', e.target.value)}
                placeholder="可选，输入头像图片URL"
              />
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">自定义提示词</div>
              <Textarea
                value={editedMemberData.custom_prompt}
                onChange={(e) => handleEditedMemberFieldChange('custom_prompt', e.target.value)}
                placeholder="可选，为角色设置自定义提示词"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditMember} disabled={isSubmitting}>
              取消
            </Button>
            <Button onClick={handleSubmitEditMember} disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '确认保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={(open) => (open ? setIsDeleteConfirmOpen(true) : handleCloseDeleteConfirm())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除角色</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              确定要删除角色 <span className="font-medium text-gray-900">"{memberToDelete?.name}"</span> 吗？
            </p>
            <p className="text-sm text-red-500 mt-2">
              此操作不可撤销，删除后该角色的所有信息将永久丢失。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDeleteConfirm} disabled={isSubmitting}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isSubmitting}>
              {isSubmitting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}; 