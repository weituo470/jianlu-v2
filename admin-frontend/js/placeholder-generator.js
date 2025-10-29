/**
 * 本地占位符图片生成器
 * 用于替代外部占位符服务，提高系统稳定性和加载速度
 */
class PlaceholderGenerator {
    /**
     * 生成SVG占位符图片
     * @param {number} width - 宽度
     * @param {number} height - 高度
     * @param {string} text - 显示文字
     * @param {string} bgColor - 背景颜色
     * @param {string} textColor - 文字颜色
     * @returns {string} SVG字符串
     */
    static generateSVG(width, height, text = '', bgColor = '#e9ecef', textColor = '#6c757d') {
        // 如果没有提供文字，使用尺寸作为文字
        if (!text) {
            text = `${width}×${height}`;
        }

        // 计算合适的字体大小
        const fontSize = Math.min(width, height) / 8;

        const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="${bgColor}"/>
    <text x="50%" y="50%"
          font-family="Arial, sans-serif"
          font-size="${fontSize}"
          fill="${textColor}"
          text-anchor="middle"
          dominant-baseline="middle">
        ${text}
    </text>
</svg>`.trim();

        return svg;
    }

    /**
     * 生成Data URL格式的占位符
     * @param {number} width - 宽度
     * @param {number} height - 高度
     * @param {string} text - 显示文字
     * @param {string} bgColor - 背景颜色
     * @param {string} textColor - 文字颜色
     * @returns {string} Data URL
     */
    static generateDataURL(width, height, text = '', bgColor = '#e9ecef', textColor = '#6c757d') {
        const svg = this.generateSVG(width, height, text, bgColor, textColor);
        const base64 = btoa(unescape(encodeURIComponent(svg)));
        return `data:image/svg+xml;base64,${base64}`;
    }

    /**
     * 生成用户头像占位符
     * @param {string} initial - 用户姓名首字母
     * @param {number} size - 头像大小
     * @returns {string} Data URL
     */
    static generateUserAvatar(initial = 'U', size = 32) {
        return this.generateDataURL(size, size, initial, '#4361ee', 'white');
    }

    /**
     * 生成团队头像占位符
     * @param {string} text - 团队名称
     * @param {number} size - 头像大小
     * @returns {string} Data URL
     */
    static generateTeamAvatar(text = '团队', size = 120) {
        return this.generateDataURL(size, size, text, '#3f37c9', 'white');
    }

    /**
     * 获取默认用户头像URL
     * @returns {string} 本地SVG文件路径
     */
    static getDefaultUserAvatar() {
        return '/images/default-user-avatar.svg';
    }

    /**
     * 获取默认团队头像URL
     * @returns {string} 本地SVG文件路径
     */
    static getDefaultTeamAvatar() {
        return '/images/default-team-avatar.svg';
    }
}

// 将类挂载到全局对象，方便在其他文件中使用
window.PlaceholderGenerator = PlaceholderGenerator;