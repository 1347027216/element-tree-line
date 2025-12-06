import './style.scss';

type CreateElement = (
    tag: string,
    data?: Record<string, unknown> | null,
    children?: unknown[] | string | null
) => unknown;

interface TreeNode {
    level: number;
    label: string;
    isLeaf: boolean;
    parent: TreeNode | null;
    id?: string | number;
    key?: string | number;
    children?: TreeNode[];
    childNodes?: TreeNode[];
}

interface TreeData {
    id?: string | number;
    key?: string | number;
    children?: TreeData[];
    [key: string]: unknown;
}

interface ScopedData {
    node: TreeNode;
    data?: TreeData;
}

type ScopedSlot = ((data: ScopedData) => unknown) | unknown[] | null;

interface ComponentProps {
    node: TreeNode;
    data?: TreeData;
    treeData?: TreeData[];
    indent: number;
    expandIconWidth: number;
    showLabelLine: boolean;
    showRootNodeLabelLine: boolean;
}

interface ComponentInstance extends ComponentProps {
    $slots?: Record<string, unknown>;
    $scopedSlots?: Record<string, ScopedSlot>;
    getScopedSlot: (slotName: string | null) => ScopedSlot;
    getScopedSlotValue: (
        scopeSlot: ScopedSlot,
        scopedData: ScopedData,
        defaultNode?: unknown
    ) => unknown;
}

interface ComponentConfig {
    name: string;
    props: {
        node: { type: ObjectConstructor; required: boolean };
        data: { type: ObjectConstructor };
        treeData: { type: ArrayConstructor };
        indent: { type: NumberConstructor; default: () => number };
        expandIconWidth: { type: NumberConstructor; default: () => number };
        showLabelLine: { type: BooleanConstructor; default: boolean };
        showRootNodeLabelLine: { type: BooleanConstructor; default: boolean };
    };
    render: (this: ComponentInstance, createElement?: CreateElement) => unknown;
    methods: {
        getScopedSlot: (
            this: ComponentInstance,
            slotName: string | null
        ) => ScopedSlot;
        getScopedSlotValue: (
            this: ComponentInstance,
            scopeSlot: ScopedSlot,
            scopedData: ScopedData,
            defaultNode?: unknown
        ) => unknown;
    };
}

function getComConfig(h?: CreateElement): ComponentConfig {
    return {
        name: 'element-tree-line',
        props: {
            node: {
                type: Object,
                required: true,
            },
            data: {
                type: Object,
            },
            treeData: {
                type: Array,
            },
            indent: {
                type: Number,
                default() {
                    return 16;
                },
            },
            expandIconWidth: {
                type: Number,
                default() {
                    return 24;
                },
            },
            showLabelLine: {
                type: Boolean,
                default: true,
            },
            showRootNodeLabelLine: {
                type: Boolean,
                default: true,
            },
        },
        render(this: ComponentInstance, createElement?: CreateElement) {
            const $createElement = h || createElement;
            if (!$createElement) {
                throw new Error('createElement function is required');
            }
            // 自定义整行节点label区域
            const scopeSlotDefault = this.getScopedSlot('default');
            // 显示横线时自定义节点label区域
            const labelSlot = this.getScopedSlot('node-label');
            // 显示横线时追加在横线右边的内容
            const afterLabelSlot = this.getScopedSlot('after-node-label');
            const labelNodes = scopeSlotDefault
                ? this.getScopedSlotValue(scopeSlotDefault, {
                      node: this.node,
                      data: this.data,
                  })
                : [
                      labelSlot
                          ? this.getScopedSlotValue(labelSlot, {
                                node: this.node,
                                data: this.data,
                            })
                          : $createElement(
                                'span',
                                { class: 'element-tree-node-label' },
                                this.node.label
                            ),
                      this.showLabelLine
                          ? $createElement('span', {
                                class: 'element-tree-node-label-line',
                            })
                          : null,
                      this.getScopedSlotValue(afterLabelSlot, {
                          node: this.node,
                          data: this.data,
                      }),
                  ];
            // 取得每一层的当前节点是不是在当前层级列表的最后一个
            const lastnodeArr: boolean[] = [];
            let currentNode: TreeNode | null = this.node;
            while (currentNode) {
                let parentNode: TreeNode | null = currentNode.parent;
                // 兼容element-plus的 el-tree-v2 (Virtualized Tree 虚拟树)
                if (currentNode.level === 1 && !currentNode.parent) {
                    // el-tree-v2的第一层node是没有parent的，必需 treeData 创建一个parent
                    if (!this.treeData || !Array.isArray(this.treeData)) {
                        throw Error(
                            'if you using el-tree-v2 (Virtualized Tree) of element-plus,element-tree-line required data.'
                        );
                    }
                    parentNode = {
                        children: Array.isArray(this.treeData)
                            ? this.treeData.map((item: TreeData) => {
                                  return {
                                      ...item,
                                      key: item.id,
                                  } as unknown as TreeNode;
                              })
                            : [],
                        level: 0,
                        key: 'node-0',
                        parent: null,
                        label: '',
                        isLeaf: false,
                    };
                }
                if (parentNode) {
                    // element-plus的 el-tree-v2 使用的是children和key， 其他使用的是 childNodes和id
                    const childList =
                        parentNode.children || parentNode.childNodes || [];
                    const index = childList.findIndex(
                        (item: TreeNode) =>
                            (item.key || item.id) ===
                            (currentNode!.key || currentNode!.id)
                    );
                    lastnodeArr.unshift(index === childList.length - 1);
                }
                currentNode = parentNode;
            }
            const lineNodes: unknown[] = [];
            for (let i = 0; i < this.node.level; i++) {
                if (lastnodeArr[i] && this.node.level - 1 !== i) {
                    continue;
                }
                // Skip root level line when showRootNodeLabelLine is false
                if (i === 0 && !this.showRootNodeLabelLine) {
                    continue;
                }
                lineNodes.push(
                    $createElement('span', {
                        class: {
                            'element-tree-node-line-ver': true,
                            'last-node-isLeaf-line':
                                lastnodeArr[i] && this.node.level - 1 === i,
                        },
                        style: {
                            left:
                                this.indent * i +
                                this.expandIconWidth / 2 +
                                'px',
                        },
                    })
                );
            }
            // Create horizontal line, but skip for root level nodes when showRootNodeLabelLine is false
            // For non-leaf nodes, the horizontal line width is 1/3 of expandIconWidth to create
            // a short connector before the expand icon. For leaf nodes, it extends the full width.
            const horLineNode =
                this.node.level === 1 && !this.showRootNodeLabelLine
                    ? null
                    : $createElement('span', {
                          class: 'element-tree-node-line-hor',
                          style: {
                              width:
                                  (this.node.isLeaf
                                      ? this.expandIconWidth
                                      : this.expandIconWidth / 3) + 'px',
                              left:
                                  (this.node.level - 1) * this.indent +
                                  this.expandIconWidth / 2 +
                                  'px',
                          },
                      });
            return $createElement(
                'span',
                {
                    class: 'element-tree-node-label-wrapper',
                },
                ([labelNodes] as unknown[])
                    .concat(lineNodes)
                    .concat(horLineNode ? [horLineNode] : [])
            );
        },
        methods: {
            getScopedSlot(
                this: ComponentInstance,
                slotName: string | null
            ): ScopedSlot {
                if (!slotName) {
                    return null;
                }
                const slotNameSplits = slotName.split('||');
                let scopeSlot: ScopedSlot = null;
                for (let index = 0; index < slotNameSplits.length; index++) {
                    const name = slotNameSplits[index];
                    const slot = (this.$slots || {})[name];
                    if (slot) {
                        scopeSlot = slot as ScopedSlot;
                        break;
                    }
                    scopeSlot = (
                        (this.$scopedSlots || {}) as Record<string, ScopedSlot>
                    )[name];
                    if (scopeSlot) {
                        break;
                    }
                }
                return scopeSlot;
            },
            getScopedSlotValue(
                this: ComponentInstance,
                scopeSlot: ScopedSlot,
                scopedData: ScopedData,
                defaultNode: unknown = null
            ): unknown {
                if (typeof scopeSlot === 'function') {
                    return scopeSlot(scopedData) || defaultNode;
                }
                return scopeSlot || defaultNode;
            },
        },
    };
}

export function getElementLabelLine(h?: CreateElement): ComponentConfig {
    const conf = getComConfig(h);
    if (h) {
        conf.methods.getScopedSlot = function getScopedSlot(
            this: ComponentInstance,
            slotName: string | null
        ): ScopedSlot {
            if (!slotName) {
                return null;
            }
            const slotNameSplits = slotName.split('||');
            let scopeSlot: ScopedSlot = null;
            for (let index = 0; index < slotNameSplits.length; index++) {
                const name = slotNameSplits[index];
                const slot = (this.$slots || {})[name];
                if (slot) {
                    scopeSlot = slot as ScopedSlot;
                    break;
                }
            }
            return scopeSlot;
        };
    }
    return conf;
}
const ElementLabelLine = getElementLabelLine();
export default ElementLabelLine;
