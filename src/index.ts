import { defineComponent, h, PropType, useSlots } from 'vue';
import './style.scss';

interface TreeNode {
    level: number;
    parent?: TreeNode | null;
    key?: string | number;
    id?: string | number;
    label?: string;
    isLeaf?: boolean;
    children?: TreeNode[];
    childNodes?: TreeNode[];
}

export default defineComponent({
    name: 'ElementTreeLine',
    props: {
        node: {
            type: Object as PropType<TreeNode>,
            required: true,
        },
        data: {
            type: Object as PropType<Record<string, any>>,
            default: () => ({}),
        },
        treeData: {
            type: Array as PropType<TreeNode[]>,
            default: () => [],
        },
        indent: {
            type: Number,
            default: 16,
        },
        showLabelLine: {
            type: Boolean,
            default: true,
        },
        showRootNodeLabelLine: {
            type: Boolean,
            default: true,
        },
        expandIconWidth: {
            type: Number,
            default: 24,
        },
    },
    setup(props) {
        // 构建 lastnodeArr：记录每一层是否为同级最后一个
        const buildLastNodeArray = (): boolean[] => {
            const lastnodeArr: boolean[] = [];
            let currentNode: TreeNode | null | undefined = props.node;

            while (currentNode) {
                let parentNode: TreeNode | null | undefined =
                    currentNode.parent;

                if (currentNode.level === 1 && !currentNode.parent) {
                    if (!props.treeData || !Array.isArray(props.treeData)) {
                        throw new Error(
                            'When using el-tree-v2 (Virtualized Tree) from Element Plus, the `treeData` prop is required.'
                        );
                    }
                    parentNode = {
                        children: props.treeData.map((item) => ({
                            ...item,
                            key: item.key ?? item.id,
                        })),
                        level: 0,
                        key: 'virtual-root',
                        parent: null,
                    };
                }

                if (parentNode) {
                    const siblings =
                        parentNode.children || parentNode.childNodes;
                    if (!siblings || !Array.isArray(siblings)) break;

                    const currentNodeKey = currentNode.key ?? currentNode.id;
                    const index = siblings.findIndex(
                        (item) => (item.key ?? item.id) === currentNodeKey
                    );

                    lastnodeArr.unshift(index === siblings.length - 1);
                }

                currentNode = parentNode?.level === 0 ? null : parentNode;
            }

            return lastnodeArr;
        };

        const lastnodeArr = buildLastNodeArray();

        return () => {
            const slots = useSlots(); // 获取插槽
            const defaultSlot = slots.default;
            const nodeLabelSlot = slots['node-label'];
            const afterNodeLabelSlot = slots['after-node-label'];

            let labelNodes;
            if (defaultSlot) {
                labelNodes = defaultSlot({
                    node: props.node,
                    data: props.data,
                });
            } else {
                labelNodes = [
                    nodeLabelSlot
                        ? nodeLabelSlot({ node: props.node, data: props.data })
                        : h(
                              'span',
                              { class: 'element-tree-node-label' },
                              props.node.label
                          ),
                    props.showLabelLine
                        ? h('span', { class: 'element-tree-node-label-line' })
                        : null,
                    afterNodeLabelSlot
                        ? afterNodeLabelSlot({
                              node: props.node,
                              data: props.data,
                          })
                        : null,
                ].filter(Boolean);
            }

            const lineNodes = [];
            for (let i = 0; i < props.node.level; i++) {
                if (lastnodeArr[i] && props.node.level - 1 !== i) continue;
                if (i === 0 && !props.showRootNodeLabelLine) continue;
                lineNodes.push(
                    h('span', {
                        class: {
                            'element-tree-node-line-ver': true,
                            'last-node-isLeaf-line':
                                lastnodeArr[i] && props.node.level - 1 === i,
                        },
                        style: {
                            left: `${
                                props.indent * i + props.expandIconWidth / 2
                            }px`,
                        },
                    })
                );
            }

            const horLineNode =
                props.node.level === 1 && !props.showRootNodeLabelLine
                    ? null
                    : h('span', {
                          class: 'element-tree-node-line-hor',
                          style: {
                              width: `${
                                  props.node.isLeaf
                                      ? props.expandIconWidth
                                      : props.expandIconWidth / 2
                              }px`,
                              left: `${
                                  (props.node.level - 1) * props.indent +
                                  props.expandIconWidth / 2
                              }px`,
                          },
                      });

            return h(
                'span',
                { class: 'element-tree-node-label-wrapper' },
                [
                    ...(Array.isArray(labelNodes) ? labelNodes : [labelNodes]),
                    ...lineNodes,
                    ...(horLineNode ? [horLineNode] : []),
                ].filter((n) => n !== null)
            );
        };
    },
});
