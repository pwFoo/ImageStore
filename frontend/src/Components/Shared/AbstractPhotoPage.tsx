import React, { useCallback, useState, useRef, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { PhotoT } from "../../Interfaces";
import { VariableSizeList as List } from "react-window";
import { Scrollbars } from "react-custom-scrollbars";
import { baseURL } from "../../API";

const useStyles = makeStyles({
    photoDiv: {
        padding: 10,
        "align-items": "center",
        "justify-content": "center",
        display: "flex",
        position: "relative",
        transition: "0.05s linear",
    },
    photoBox: { transition: "0.05s linear", position: "absolute", left: 15, top: 15, height: 20, width: 20 },
});

function Photo(props: any) {
    const realUrl = baseURL + "/media/thumb_" + props.id
    const [url, setUrl] = useState("");
    useEffect(() => {
        const timeout = setTimeout(() => setUrl(baseURL + "/media/thumb_" + props.id), 500);
        return () => clearTimeout(timeout)
    }, [props.id])
    useEffect(() => {
        if (!props.isScrolling)
            setUrl(realUrl)
    })
    const padding = props.selected ? 0.9 : 1.0;
    const [vis, setVis] = useState(0);
    const opacity = props.anySelected() ? 255 : vis;

    const classes = useStyles();
    return (
        <div
            className={classes.photoDiv}
            style={{
                height: props.y,
                width: props.x,
            }}
            onMouseEnter={() => setVis(0.4)}
            onMouseLeave={() => setVis(0)}
        >
            <div onClick={props.imageClick}>
                <div style={{ backgroundColor: "#eeeeee", height: props.y - 5, width: props.x - 5 }}>
                    <div style={{ transition: "0.05s linear", transform: `scale(${padding})`, backgroundImage: url === "" ? "none" : `url(${url})`, height: props.y - 5, width: props.x - 5, backgroundSize: "100% 100%" }} />
                </div>
            </div>
            {(vis || props.anySelected() || true) && <input className={classes.photoBox} style={{ opacity: opacity }} readOnly={true} checked={props.selected} type="checkbox" onClick={props.click} />}
        </div>
    );
}
const makePhoto = (photo: PhotoT, realH: number, props: any, isScrolling: boolean) => (
    <Photo
        key={photo.id}
        id={photo.id}
        x={(photo.width * realH) / photo.height}
        y={realH}
        click={props.clickHandler(photo.id)}
        imageClick={props.imageClickHandler(photo.id)}
        selected={props.selected.includes(photo.id)}
        anySelected={props.anySelected}
        outZoom={0.9}
        isScrolling={isScrolling}
    />
);

const targetHeight = 300;

const calculate = (photos: PhotoT[], width: number) => {
    const rowH: number[] = [];
    const rowPics: PhotoT[][] = [];

    let ptr = 0;

    while (ptr !== photos.length) {
        let curPics: PhotoT[] = [];
        let curWidth = 0;

        while (
            ptr !== photos.length &&
            (curWidth === 0 ||
                Math.abs(targetHeight - (targetHeight * width) / curWidth) > Math.abs(targetHeight - (targetHeight * width) / (curWidth + (photos[ptr].width / photos[ptr].height) * targetHeight)))
        ) {
            curPics.push(photos[ptr]);
            curWidth += (photos[ptr].width / photos[ptr].height) * targetHeight;
            ptr++;
        }

        rowPics.push(curPics);
        if (ptr !== photos.length || width < curWidth) rowH.push((targetHeight * width) / curWidth);
        else rowH.push(targetHeight);
    }

    return { rowH, rowPics };
};

const Row = (altprops: any) =>
    altprops.data.linNum <= altprops.index ? (
        <div style={{ ...altprops.style, display: "flex", transition: "0.05s linear" }}>
            {altprops.data.rowPics[altprops.index].map((p: PhotoT) => makePhoto(p, altprops.data.rowH[altprops.index], altprops.data.props, altprops.isScrolling))}
        </div>
    ) : (
            <div>{altprops.data.rowPics[altprops.index]}</div>
        );

const CustomScrollbars = ({ onScroll, forwardedRef, style, children }: any) => {
    const refSetter = useCallback(
        (scrollbarsRef) => {
            if (scrollbarsRef) {
                forwardedRef(scrollbarsRef.view);
            } else {
                forwardedRef(null);
            }
        },
        [forwardedRef]
    );

    return (
        <Scrollbars ref={refSetter} style={{ ...style, overflow: "hidden" }} onScroll={onScroll}>
            {children}
        </Scrollbars>
    );
};

const CustomScrollbarsVirtualList = React.forwardRef((props, ref) => <CustomScrollbars {...props} forwardedRef={ref} />);

export default function AbstractPhotoPage(props: {
    photos: PhotoT[];
    height: number;
    width: number;
    clickHandler: (id: string) => () => void;
    imageClickHandler: (id: string) => () => void;
    selected: string[];
    anySelected: any;
    heights: number[];
    lines: any[];
    viewId: string;
    setViewId: (id: string) => void;
}) {
    const [jumped, setJumped] = useState(false);
    const listRef = useRef<List>(null);
    useEffect(() => {
        listRef.current?.resetAfterIndex(0);
        const item = tmpRowPics.findIndex((photos: PhotoT[]) => {
            return photos.filter((p) => p.id === props.viewId).length !== 0;
        });
        if (!jumped && item !== 1) listRef.current?.scrollToItem(item + props.lines.length, "smart");
        setJumped(true);
    }, [props.width, props.photos, props.heights]);
    const { rowH: tmpRowH, rowPics: tmpRowPics } = calculate(props.photos, props.width - 12);
    const rowH = [...props.heights, ...tmpRowH];
    const rowPics = [...props.lines, ...tmpRowPics];
    const getItemSize = (index: number) => (index !== rowH.length - 1 ? rowH[index] : rowH[index] + 20);

    return (
        <List
            useIsScrolling
            overscanCount={10}
            height={props.height}
            ref={listRef}
            itemData={{ rowH, rowPics, props, linNum: props.lines.length }}
            itemCount={rowH.length}
            itemSize={getItemSize}
            width={props.width - 1}
            outerElementType={CustomScrollbarsVirtualList}
        >
            {Row}
        </List>
    );
}
